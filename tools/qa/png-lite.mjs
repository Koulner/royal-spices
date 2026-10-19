// Minimal PNG codec on Node built-ins (zlib), no packages. Used by the flow tools
// (pipeline/images/build-flow.mjs, tools/qa/flow-check.mjs) and tests/flow-warp.test.mjs.
//
// Read:  non-interlaced 8-bit gray, gray+alpha, RGB, RGBA and 16-bit gray. Ancillary chunks are skipped.
// Write: 8-bit gray, 16-bit gray and 8-bit RGB. Deterministic: one fixed filter for every row
//        (Paeth for gray, Up for RGB), fixed zlib level, no time or text chunks. Same input → same bytes.
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
// channels per PNG colour type (palette images are not needed here)
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * Decode a PNG buffer.
 * @returns {{width:number,height:number,channels:number,bitDepth:number,data:Uint8Array|Uint16Array}}
 *   data is row-major, interleaved channels; 16-bit samples come as Uint16Array.
 */
export function decodePNG(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('png-lite: not a PNG');
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      bitDepth = body[8]; colorType = body[9]; interlace = body[12];
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`png-lite: colour type ${colorType} not supported`);
  if (interlace) throw new Error('png-lite: interlaced PNG not supported');
  if (!(bitDepth === 8 || (bitDepth === 16 && colorType === 0))) throw new Error(`png-lite: ${bitDepth}-bit colour type ${colorType} not supported`);
  const bpp = channels * (bitDepth / 8); // bytes per pixel
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * height) throw new Error('png-lite: truncated image data');
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1, dst = y * stride, prev = dst - stride;
    for (let x = 0; x < stride; x++) {
      const r = raw[src + x];
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = y > 0 && x >= bpp ? out[prev + x - bpp] : 0;
      let v;
      if (f === 0) v = r;
      else if (f === 1) v = r + a;
      else if (f === 2) v = r + b;
      else if (f === 3) v = r + ((a + b) >> 1);
      else if (f === 4) v = r + paeth(a, b, c);
      else throw new Error(`png-lite: bad filter ${f}`);
      out[dst + x] = v & 255;
    }
  }
  if (bitDepth === 8) return { width, height, channels, bitDepth, data: out };
  const data = new Uint16Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = (out[2 * i] << 8) | out[2 * i + 1];
  return { width, height, channels, bitDepth, data };
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
  return Buffer.concat([head, body, crc]);
}

/**
 * Encode an image. channels 1 (gray) or 3 (RGB); bitDepth 8, or 16 for gray only.
 * data: Uint8Array (8 bit) or Uint16Array / number array (16 bit), row-major interleaved.
 */
export function encodePNG({ width, height, channels = 1, bitDepth = 8, data }) {
  if (!(channels === 1 || (channels === 3 && bitDepth === 8))) throw new Error('png-lite: write supports gray 8/16 and RGB 8');
  if (!(bitDepth === 8 || bitDepth === 16)) throw new Error('png-lite: bit depth 8 or 16');
  const bpp = channels * (bitDepth / 8);
  const stride = width * bpp;
  const bytes = new Uint8Array(stride * height);
  if (bitDepth === 8) for (let i = 0; i < bytes.length; i++) bytes[i] = data[i];
  else for (let i = 0; i < width * height; i++) { bytes[2 * i] = (data[i] >> 8) & 255; bytes[2 * i + 1] = data[i] & 255; }
  // fixed filter per image type: Paeth suits smooth gray maps, Up suits rendered RGB
  const filter = channels === 1 ? 4 : 2;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const dst = y * (stride + 1), row = y * stride, prev = row - stride;
    raw[dst] = filter;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? bytes[row + x - bpp] : 0;
      const b = y > 0 ? bytes[prev + x] : 0;
      const c = y > 0 && x >= bpp ? bytes[prev + x - bpp] : 0;
      const pred = filter === 4 ? paeth(a, b, c) : b;
      raw[dst + 1 + x] = (bytes[row + x] - pred) & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth; ihdr[9] = channels === 1 ? 0 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9, memLevel: 9, strategy: 0 });
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/** Convenience: 8-bit gray. */
export const encodeGray8 = (width, height, data) => encodePNG({ width, height, channels: 1, bitDepth: 8, data });
/** Convenience: 16-bit gray. */
export const encodeGray16 = (width, height, data) => encodePNG({ width, height, channels: 1, bitDepth: 16, data });
/** Convenience: 8-bit RGB. */
export const encodeRGB8 = (width, height, data) => encodePNG({ width, height, channels: 3, bitDepth: 8, data });
