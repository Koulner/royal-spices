// Hero video: splits one encoded set into the files the site loads (T-20261031-01). Node only, no dependencies.
//
//   node tools/hero-video/split.mjs <set.bin> <set.json> <set.pos.json> <outdir> --variant desktop|mobile
//        [--max-bytes 1048576] [--base <n>]
//
//   <set.bin>, <set.json>  H.264 access units (AVCC, length-prefixed, back to back) and their index from the encoder,
//                          format rs-video-1: frames [{o, n, key}] (byte offset and length in the .bin), codec,
//                          description (avcC, base64), colorSpace, gop, displayWidth, displayHeight
//   <set.pos.json>         position list rs-pos-1: frame k sits at journey progress i[k] / (grid - 1)
//   <outdir>               e.g. public/hero/v/c1920; receives index.json (rs-video-2) and 00.bin, 01.bin, ...
//                          (older NN.bin files there that the new set does not use are removed)
//   --variant              desktop (landscape set) or mobile (portrait set)
//   --max-bytes            segment size limit, default 1 MiB. Segments are cut at key frames only: a single GOP
//                          above the limit becomes a segment of its own.
//   --base                 base frames of today's motion set (default 713 desktop, 505 mobile). The covered ranges
//                          (`cover`) join frames whose gap is at most (grid - 1) / (base - 1) grid steps.
//
// Prints the manifest entry for src/data/hero-video.json (`sets.<name>`) on stdout. Swapping the hero video means:
// run this for each set, replace the folders under public/hero/v/ and the entries in src/data/hero-video.json,
// then run `npm test` (tests/journey-video.test.mjs checks segments, index and manifest against each other).
//
// index.json (rs-video-2, compact): set, variant, codec, description, colorSpace, width, height, grid, gop, frames,
// bytes, posDelta + pos (grid indices; with posDelta the first value is absolute, the rest are differences),
// sizes (bytes per frame), keys (indices of the key frames), segments [{file, first, count, bytes}].
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_BYTES = 1048576;
export const BASE_FRAMES = { desktop: 713, mobile: 505 };

/** Segments from the frame list: whole GOPs, packed while they fit into maxBytes. */
export function plan(frames, maxBytes = MAX_BYTES) {
  if (!frames.length || !frames[0].key) throw new Error('frame 0 is not a key frame');
  const gops = [];
  frames.forEach((f, i) => {
    if (f.key) gops.push({ first: i, count: 0, bytes: 0 });
    const g = gops[gops.length - 1];
    g.count++;
    g.bytes += f.n;
  });
  const segs = [];
  for (const g of gops) {
    const s = segs[segs.length - 1];
    if (s && s.bytes + g.bytes <= maxBytes) {
      s.count += g.count;
      s.bytes += g.bytes;
    } else segs.push({ ...g });
  }
  return segs;
}

/** Same rule as coverFromPos in src/scripts/journey-video.ts: runs of frames with gaps of at most maxGap grid steps. */
export function coverFromPos(pos, grid, maxGap) {
  const out = [];
  let from = 0;
  for (let k = 1; k <= pos.length; k++) {
    if (k === pos.length || pos[k] - pos[k - 1] > maxGap + 1e-9) {
      out.push([pos[from] / (grid - 1), pos[k - 1] / (grid - 1)]);
      from = k;
    }
  }
  return out;
}

export function split(binPath, jsonPath, posPath, outdir, { variant, maxBytes = MAX_BYTES, base = BASE_FRAMES[variant] } = {}) {
  if (!(variant in BASE_FRAMES)) throw new Error('--variant must be desktop or mobile');
  if (!(Number.isInteger(maxBytes) && maxBytes > 0)) throw new Error('--max-bytes must be a positive integer');
  if (!(Number.isInteger(base) && base > 1)) throw new Error('--base must be an integer above 1');
  const bin = readFileSync(binPath);
  const meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const pos = JSON.parse(readFileSync(posPath, 'utf8'));
  if (meta.format !== 'rs-video-1') throw new Error('index: format ' + meta.format);
  if (pos.format !== 'rs-pos-1') throw new Error('position list: format ' + pos.format);
  if (!/^[\w-]+$/.test(meta.set ?? '')) throw new Error('index: bad set name ' + meta.set);
  const frames = meta.frames;
  const n = frames.length;
  if (pos.i.length !== n) throw new Error(`position list: ${pos.i.length} positions for ${n} frames`);
  for (let k = 0; k < n; k++) {
    if (frames[k].o !== (k ? frames[k - 1].o + frames[k - 1].n : 0) || !(frames[k].n > 0)) throw new Error('frames are not back to back at ' + k);
    if (k && !(pos.i[k] > pos.i[k - 1])) throw new Error('position list not ascending at ' + k);
  }
  if (frames[n - 1].o + frames[n - 1].n !== bin.length) throw new Error('index does not match the .bin size');
  if (pos.i[0] < 0 || pos.i[n - 1] > pos.grid - 1) throw new Error('position list outside the grid');
  const segs = plan(frames, maxBytes);
  mkdirSync(outdir, { recursive: true });
  const digits = Math.max(2, String(segs.length - 1).length);
  const names = new Set();
  const segments = segs.map((s, k) => {
    const file = String(k).padStart(digits, '0') + '.bin';
    names.add(file);
    writeFileSync(join(outdir, file), bin.subarray(frames[s.first].o, frames[s.first].o + s.bytes));
    return { file, first: s.first, count: s.count, bytes: s.bytes };
  });
  for (const f of readdirSync(outdir)) if (/^\d+\.bin$/.test(f) && !names.has(f)) rmSync(join(outdir, f));
  const width = meta.displayWidth ?? meta.codedWidth;
  const height = meta.displayHeight ?? meta.codedHeight;
  const index = {
    format: 'rs-video-2', set: meta.set, variant, codec: meta.codec, description: meta.description ?? null,
    colorSpace: meta.colorSpace ?? null, width, height, grid: pos.grid, gop: meta.gop, frames: n, bytes: bin.length,
    posDelta: true, pos: pos.i.map((x, k) => (k ? x - pos.i[k - 1] : x)), sizes: frames.map((f) => f.n),
    keys: frames.flatMap((f, k) => (f.key ? [k] : [])), segments,
  };
  writeFileSync(join(outdir, 'index.json'), JSON.stringify(index));
  const cover = coverFromPos(pos.i, pos.grid, (pos.grid - 1) / (base - 1));
  return {
    name: meta.set,
    md5: createHash('md5').update(bin).digest('hex'),
    entry: { variant, width, height, frames: n, bytes: bin.length, cover, index: meta.set + '/index.json' },
  };
}

function main(argv) {
  const args = [], opt = {};
  for (let k = 0; k < argv.length; k++) {
    if (argv[k].startsWith('--')) opt[argv[k].slice(2)] = argv[++k];
    else args.push(argv[k]);
  }
  if (args.length !== 4 || !(opt.variant in BASE_FRAMES)) {
    process.stderr.write('usage: node split.mjs <bin> <json> <pos.json> <outdir> --variant desktop|mobile [--max-bytes 1048576] [--base n]\n');
    process.exit(2);
  }
  const r = split(...args, {
    variant: opt.variant,
    maxBytes: opt['max-bytes'] === undefined ? MAX_BYTES : Number(opt['max-bytes']),
    base: opt.base === undefined ? BASE_FRAMES[opt.variant] : Number(opt.base),
  });
  process.stderr.write(`${r.name}: ${r.entry.frames} frames, ${r.entry.bytes} bytes, ${r.entry.index.replace('/index.json', '')} md5 ${r.md5} -> ${resolve(args[3])}\n`);
  process.stdout.write(JSON.stringify({ [r.name]: r.entry }) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write('split: ' + (e?.message ?? e) + '\n');
    process.exit(1);
  }
}
