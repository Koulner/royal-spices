// Hero journey, video path: the camera move drawn from dense real frames, an H.264 stream that the browser decodes
// with WebCodecs and shows through WebGL2 (T-20261031-01, port of the prototype T-20261023-04 proto/player.js).
//
// journey.ts imports this file only when videoUsable() says yes. The WebP frames stay underneath: draw(p) returns
// false whenever the frame for p is not in memory, and the caller cross-fades as before. After any error (decoder,
// a broken segment, a lost GL context) onError is called once and the module stays silent; the caller destroys it.
//
// Data (tools/hero-video/split.mjs): public/hero/v/<set>/index.json (rs-video-2) plus segments NN.bin, cut at key
// frames, each at most 1 MiB. Frame k sits at journey progress p = pos[k] / (grid - 1); spacing may be uneven, and
// the set may cover only parts of the journey (`cover` in src/data/hero-video.json).
//
// Kept from the prototype (measured there): YUV ring (per slot Y as R8 + UV as RG8 at half size, converted on the
// GPU through one RGBA scratch texture), decoder never reset on jumps (jump=keep: outputs still in flight run out
// and are dropped), at most 8 open VideoFrames, 16 chunks in flight, an upload budget of 4 ms per animation frame
// (further outputs wait open, at most 4), one long decode chain forward, one GOP at a time backward.
//
// The decoder is never flushed (T-20261031-01 C3–C5: flush() restarted the hardware decoder and cost frames, mostly
// backward). It holds its last frames until more chunks follow, so what came out is told from a count (one output per
// chunk, in order), and push() feeds one more chunk when the wanted frame is still inside.
//
// URL switches: ?vmode=nearest|blend (default nearest), ?hw=0 (software decoder), ?vfail=<p> (one artificial error
// as soon as p is passed), ?vstats=1 (window.__rsVideo() returns stats()), ?video=off and ?webcodecs=0 (videoUsable
// says no). No HUD, no console output.

export type VideoSet = { name: string; variant: 'desktop' | 'mobile'; width: number; height: number; frames: number; bytes: number; cover: [number, number][]; index: string };
export type VideoManifest = { format: 'rs-video-manifest-1'; base: string; sets: Record<string, Omit<VideoSet, 'name'>> };
export type VideoSegment = { file: string; first: number; count: number; bytes: number };
/** index.json of one set (rs-video-2) after parseIndex: positions decoded to absolute grid indices. */
export type VideoIndex = {
  set: string;
  variant: 'desktop' | 'mobile';
  codec: string;
  description: string | null;
  colorSpace: VideoColorSpaceInit | null;
  width: number;
  height: number;
  grid: number;
  gop: number;
  frames: number;
  bytes: number;
  pos: Int32Array;
  sizes: Int32Array;
  keys: Int32Array;
  segments: VideoSegment[];
};
export type VideoStats = {
  resets: number;
  configures: number;
  maxOpen: number;
  maxWorkMs: number;
  over8: number;
  texBytes: number;
  decoded: number;
  misses: number;
  segmentsLoaded: number;
  bytesLoaded: number;
};
export interface VideoPlayer {
  canvas: HTMLCanvasElement;
  ready(p: number): boolean;
  draw(p: number, dir: number): boolean;
  load(from: number): void;
  stats(): VideoStats;
  destroy(): void;
}

const EPS = 1e-9;
const SNAP = 0.004; // blend: closer than this to a frame shows the frame alone (prototype)
const DEFAULT_CODEC = 'avc1.640028';

// ---------------------------------------------------------------- pure logic (tests/journey-video.test.mjs)

/** The first set of the wanted variant, or null if the manifest is not usable. */
export function pickSet(m: VideoManifest, variant: 'desktop' | 'mobile'): VideoSet | null {
  if (!m || m.format !== 'rs-video-manifest-1' || !m.sets || typeof m.sets !== 'object') return null;
  for (const [name, s] of Object.entries(m.sets)) if (s && s.variant === variant) return { name, ...s };
  return null;
}

/** Whether progress p lies in one of the ranges the set covers. */
export function covers(set: VideoSet, p: number): boolean {
  return set.cover.some(([a, b]) => p >= a - EPS && p <= b + EPS);
}

/**
 * The part of the video a canvas of cw x ch shows, as [u0, v0, du, dv] (v from the top): like object-fit: cover with
 * object-position fx fy (0…1), the crop of the WebP layers. The cut-off share goes (1 - visible) * f before the crop.
 */
export function cropOf(cw: number, ch: number, W: number, H: number, fx = 0.5, fy = 0.5): [number, number, number, number] {
  const ca = cw / ch, va = W / H;
  return ca > va ? [0, (1 - va / ca) * fy, 1, va / ca] : [(1 - ca / va) * fx, 0, ca / va, 1];
}

/**
 * Covered ranges in progress: runs of frames whose neighbours are at most maxGap grid steps apart.
 * maxGap is the spacing of two of today's motion frames, (grid - 1) / (base frames - 1).
 */
export function coverFromPos(pos: ArrayLike<number>, grid: number, maxGap: number): [number, number][] {
  const out: [number, number][] = [];
  let from = 0;
  for (let k = 1; k <= pos.length; k++) {
    if (k === pos.length || pos[k] - pos[k - 1] > maxGap + EPS) {
      out.push([pos[from] / (grid - 1), pos[k - 1] / (grid - 1)]);
      from = k;
    }
  }
  return out;
}

/**
 * Frames for progress p: nearest = the frame closer in p (a = b, t = 0); blend = the two neighbours a < b mixed by
 * t = distance in p (snapped to a single frame within SNAP). Outside the positions: the end frame.
 */
export function locate(pos: ArrayLike<number>, grid: number, p: number, mode: 'nearest' | 'blend'): { a: number; b: number; t: number } {
  const last = pos.length - 1;
  const x = p * (grid - 1);
  if (last <= 0 || x <= pos[0]) return { a: 0, b: 0, t: 0 };
  if (x >= pos[last]) return { a: last, b: last, t: 0 };
  let lo = 0, hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pos[mid] <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - pos[lo]) / (pos[lo + 1] - pos[lo]);
  if (mode === 'nearest') {
    const k = t < 0.5 ? lo : lo + 1;
    return { a: k, b: k, t: 0 };
  }
  if (t < SNAP) return { a: lo, b: lo, t: 0 };
  if (t > 1 - SNAP) return { a: lo + 1, b: lo + 1, t: 0 };
  return { a: lo, b: lo + 1, t };
}

/** Whether the progress range of a segment touches the window (progress [p0, p1]). */
export function inWindow(s: { first: number; count: number }, pos: ArrayLike<number>, grid: number, window: [number, number]): boolean {
  const g = grid - 1;
  return pos[s.first + s.count - 1] / g >= Math.min(window[0], window[1]) - EPS && pos[s.first] / g <= Math.max(window[0], window[1]) + EPS;
}

/**
 * Loading order of the segments (indices into segs): first those whose progress range touches the start window
 * (progress [p0, p1]), then all others; within each group by distance from progress `from`. Each segment once.
 */
export function segmentOrder(segs: { first: number; count: number }[], pos: ArrayLike<number>, grid: number, window: [number, number], from: number): number[] {
  const g = grid - 1;
  const items = segs.map((s, k) => {
    const r0 = pos[s.first] / g, r1 = pos[s.first + s.count - 1] / g;
    return { k, start: inWindow(s, pos, grid, window), d: from < r0 ? r0 - from : from > r1 ? from - r1 : 0 };
  });
  items.sort((a, b) => Number(b.start) - Number(a.start) || a.d - b.d || a.k - b.k);
  return items.map((x) => x.k);
}

/** Checks index.json (rs-video-2) and decodes the position deltas. Throws on anything inconsistent. */
export function parseIndex(json: unknown): VideoIndex {
  const bad = (what: string): never => {
    throw new Error('hero video index: ' + what);
  };
  const m = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  if (m.format !== 'rs-video-2') bad('format ' + String(m.format));
  if (m.variant !== 'desktop' && m.variant !== 'mobile') bad('variant ' + String(m.variant));
  if (typeof m.codec !== 'string' || !m.codec) bad('codec');
  const int = (x: unknown, min: number): number => (Number.isInteger(x) && (x as number) >= min ? (x as number) : bad('bad number ' + String(x)));
  const ints = (x: unknown, name: string): number[] => (Array.isArray(x) && x.every((v) => Number.isInteger(v)) ? (x as number[]) : bad(name));
  const width = int(m.width, 1), height = int(m.height, 1), grid = int(m.grid, 2), gop = int(m.gop, 1);
  const rawPos = ints(m.pos, 'pos'), sizeList = ints(m.sizes, 'sizes'), keyList = ints(m.keys, 'keys');
  const n = sizeList.length;
  if (!n || rawPos.length !== n) bad('pos and sizes differ in length');
  if (m.frames !== undefined && m.frames !== n) bad('frames ' + String(m.frames) + ' instead of ' + n);
  const pos = new Int32Array(n), sizes = Int32Array.from(sizeList), keys = Int32Array.from(keyList);
  for (let k = 0; k < n; k++) {
    pos[k] = m.posDelta === true && k ? pos[k - 1] + rawPos[k] : rawPos[k];
    if (k && !(pos[k] > pos[k - 1])) bad('pos not ascending at ' + k);
    if (!(sizes[k] > 0)) bad('size of frame ' + k);
  }
  if (pos[0] < 0 || pos[n - 1] > grid - 1) bad('pos outside the grid');
  if (!keys.length || keys[0] !== 0) bad('frame 0 is not a key frame');
  const isKey = new Uint8Array(n);
  for (let k = 0; k < keys.length; k++) {
    if (keys[k] >= n || (k && !(keys[k] > keys[k - 1]))) bad('keys');
    isKey[keys[k]] = 1;
  }
  if (!Array.isArray(m.segments) || !m.segments.length) bad('segments');
  const segments: VideoSegment[] = [];
  let next = 0, total = 0;
  for (const s of m.segments as Record<string, unknown>[]) {
    const file = typeof s?.file === 'string' && /^[\w-]+\.bin$/.test(s.file) ? s.file : bad('segment file');
    const first = int(s.first, 0), count = int(s.count, 1), bytes = int(s.bytes, 1);
    if (first !== next || first + count > n) bad('segments not back to back at ' + file);
    if (!isKey[first]) bad(file + ' does not start with a key frame');
    let sum = 0;
    for (let k = first; k < first + count; k++) sum += sizes[k];
    if (sum !== bytes) bad(file + ': ' + bytes + ' bytes, frames sum to ' + sum);
    segments.push({ file, first, count, bytes });
    next = first + count;
    total += bytes;
  }
  if (next !== n) bad('segments end at ' + next + ' of ' + n + ' frames');
  if (m.bytes !== undefined && m.bytes !== total) bad('bytes');
  return {
    set: typeof m.set === 'string' ? m.set : '',
    variant: m.variant as 'desktop' | 'mobile',
    codec: m.codec as string,
    description: typeof m.description === 'string' && m.description ? m.description : null,
    colorSpace: m.colorSpace && typeof m.colorSpace === 'object' ? (m.colorSpace as VideoColorSpaceInit) : null,
    width, height, grid, gop, frames: n, bytes: total, pos, sizes, keys, segments,
  };
}

/** Whether the video path may start: not switched off, WebCodecs present, the codec supported. */
export async function videoUsable(search: string, codec?: string): Promise<boolean> {
  const q = new URLSearchParams(search);
  if (q.get('video') === 'off' || q.get('webcodecs') === '0') return false;
  const g = globalThis as { VideoDecoder?: typeof VideoDecoder; EncodedVideoChunk?: unknown };
  if (typeof g.VideoDecoder !== 'function' || typeof g.EncodedVideoChunk !== 'function') return false;
  try {
    const hardwareAcceleration: HardwareAcceleration = q.get('hw') === '0' ? 'prefer-software' : 'no-preference';
    return (await g.VideoDecoder.isConfigSupported({ codec: codec || DEFAULT_CODEC, hardwareAcceleration })).supported === true;
  } catch {
    return false;
  }
}

/** AVCC access unit at b[from, from + size): well-formed length-prefixed NAL units, one of them an IDR slice. */
function idrUnit(b: Uint8Array, from: number, size: number, lenSize: number): boolean {
  const end = from + size;
  let o = from, idr = false;
  while (o + lenSize <= end) {
    let len = 0;
    for (let k = 0; k < lenSize; k++) len = len * 256 + b[o + k];
    o += lenSize;
    if (len < 1 || o + len > end) return false;
    if ((b[o] & 31) === 5) idr = true;
    o += len;
  }
  return o === end && idr;
}

// ---------------------------------------------------------------- player

const TS = 1000; // chunk timestamp per frame index
const BUDGET = 4; // ms of uploads per animation frame; further outputs wait open
const MAX_OPEN = 8; // open VideoFrames, hard limit (the hardware decoder stalls at 10, T-20261023-01 D)
const MAX_INFLIGHT = 16; // chunks fed but not yet output
const MAX_WAIT = 4; // decoded frames kept open until the next upload budget
const MAX_FETCH = 2; // segments loading at the same time
const STALL_MS = 300; // no output for this long with chunks in flight: push on, or give up what the decoder holds
const RING_MIN = 12;
const RING_MAX = 160;

const VS = `#version 300 es
in vec2 p; uniform vec4 uvr; out vec2 uv;
void main() { uv = uvr.xy + vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5) * uvr.zw; gl_Position = vec4(p, 0.0, 1.0); }`;
const HEAD = `#version 300 es
precision highp float; precision highp int;
`;
const OFF = '0.50196078'; // 128 / 255
// BT.709, full range (the decoder delivers RGB from the same matrix)
const FS_SHOW = HEAD + `uniform sampler2D ya; uniform sampler2D ca; uniform sampler2D yb; uniform sampler2D cb; uniform float t; in vec2 uv; out vec4 o;
vec3 rgb(float y, vec2 c) { c -= ${OFF}; return vec3(y + 1.5748 * c.y, y - 0.187324 * c.x - 0.468124 * c.y, y + 1.8556 * c.x); }
void main() { vec3 A = rgb(texture(ya, uv).r, texture(ca, uv).rg), B = rgb(texture(yb, uv).r, texture(cb, uv).rg); o = vec4(clamp(mix(A, B, t), 0.0, 1.0), 1.0); }`;
const FS_Y = HEAD + `uniform sampler2D s; out vec4 o;
void main() { o = vec4(dot(texelFetch(s, ivec2(gl_FragCoord.xy), 0).rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 0.0, 1.0); }`;
const FS_UV = HEAD + `uniform sampler2D s; uniform ivec2 mx; out vec4 o;
void main() { ivec2 a = ivec2(gl_FragCoord.xy) * 2, b = min(a + 1, mx);
  vec3 c = 0.25 * (texelFetch(s, a, 0).rgb + texelFetch(s, ivec2(b.x, a.y), 0).rgb + texelFetch(s, ivec2(a.x, b.y), 0).rgb + texelFetch(s, b, 0).rgb);
  o = vec4(dot(c, vec3(-0.114572, -0.385428, 0.5)) + ${OFF}, dot(c, vec3(0.5, -0.454153, -0.045847)) + ${OFF}, 0.0, 1.0); }`;

type Slot = { y: WebGLTexture; c: WebGLTexture; frame: number };

/**
 * Loads the set's index, checks the decoder configuration, builds the GL ring and starts loading the segments
 * (start window first). Rejects when that setup fails; later errors go to onError. `window` is the start window
 * in progress [p0, p1]; memBytes is the texture budget (YUV ring plus the RGBA scratch texture). `focal` is the crop
 * point (0…1) as in object-position; resize() reads it on every call (default: centred).
 */
export async function createVideo(o: { host: HTMLElement; base: string; set: VideoSet; search: string; memBytes: number; window: [number, number]; focal?: () => [number, number]; onError: (e: unknown) => void }): Promise<VideoPlayer> {
  const q = new URLSearchParams(o.search);
  const mode: 'nearest' | 'blend' = q.get('vmode') === 'blend' ? 'blend' : 'nearest';
  const forceSw = q.get('hw') === '0';
  const vfailQ = q.has('vfail') ? Number(q.get('vfail')) : NaN;
  let vfail = Number.isFinite(vfailQ) ? vfailQ : Infinity;
  const base = o.base.replace(/\/+$/, '');
  const dirUrl = base + '/' + o.set.index.replace(/[^/]*$/, '');
  const abort = new AbortController();

  const r = await fetch(base + '/' + o.set.index, { signal: abort.signal });
  if (!r.ok) throw new Error('hero video index: HTTP ' + r.status);
  const idx = parseIndex(await r.json());
  if (idx.frames !== o.set.frames || idx.width !== o.set.width || idx.height !== o.set.height) throw new Error('hero video index does not match the manifest');
  const W = idx.width, H = idx.height, CW = (W + 1) >> 1, CH = (H + 1) >> 1, n = idx.frames, last = n - 1;
  const desc = idx.description ? Uint8Array.from(atob(idx.description), (c) => c.charCodeAt(0)) : undefined;
  const lenSize = desc && desc.length > 4 ? (desc[4] & 3) + 1 : 0; // AVCC NAL length size; 0 = not checked
  const cfg = (hw: boolean): VideoDecoderConfig => ({
    codec: idx.codec,
    codedWidth: W,
    codedHeight: H,
    ...(desc ? { description: desc } : {}),
    ...(idx.colorSpace ? { colorSpace: idx.colorSpace } : {}),
    hardwareAcceleration: hw ? 'prefer-hardware' : 'prefer-software',
  });
  let config: VideoDecoderConfig | null = null;
  for (const hw of forceSw ? [false] : [true, false]) {
    try {
      if ((await VideoDecoder.isConfigSupported(cfg(hw))).supported) {
        config = cfg(hw);
        break;
      }
    } catch {}
  }
  if (!config) throw new Error('hero video: decoder configuration not supported (' + idx.codec + ')');
  const decoderConfig: VideoDecoderConfig = config;

  // frame tables: key frame before each frame, segment and offset inside it
  const isKey = new Uint8Array(n), keyOf = new Int32Array(n), segOf = new Int32Array(n), offOf = new Int32Array(n);
  for (const k of idx.keys) isKey[k] = 1;
  for (let i = 0; i < n; i++) keyOf[i] = isKey[i] ? i : keyOf[i - 1];
  idx.segments.forEach((s, k) => {
    for (let i = s.first, off = 0; i < s.first + s.count; off += idx.sizes[i++]) {
      segOf[i] = k;
      offOf[i] = off;
    }
  });
  const data: (Uint8Array | null)[] = idx.segments.map(() => null);
  const where = new Int32Array(n).fill(-1); // ring slot of each frame, -1 = not resident

  // ---- WebGL2 ring
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  const ctx = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!ctx) throw new Error('hero video: WebGL2 missing');
  const gl: WebGL2RenderingContext = ctx;
  const SLOT = W * H + CW * CH * 2;
  const EXTRA = W * H * 4; // RGBA scratch texture for the conversion
  const RING = Math.min(n, Math.max(RING_MIN, Math.min(RING_MAX, Math.floor((o.memBytes - EXTRA) / SLOT))));
  const AHEAD = Math.max(1, Math.round((RING - 2) * 0.7)); // ring slots in scroll direction
  const BEHIND = Math.max(1, RING - 2 - AHEAD); // against it; 2 spare slots for the drawn pair
  const link = (fs: string) => {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('hero video shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('hero video program: ' + gl.getProgramInfoLog(prog));
    return prog;
  };
  const newTex = (fmt: number, w: number, h: number) => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  const progShow = link(FS_SHOW), progY = link(FS_Y), progUV = link(FS_UV);
  gl.useProgram(progShow);
  const uR = gl.getUniformLocation(progShow, 'uvr'), uT = gl.getUniformLocation(progShow, 't');
  ['ya', 'ca', 'yb', 'cb'].forEach((name, k) => gl.uniform1i(gl.getUniformLocation(progShow, name), k));
  gl.useProgram(progY);
  gl.uniform1i(gl.getUniformLocation(progY, 's'), 0);
  gl.useProgram(progUV);
  gl.uniform1i(gl.getUniformLocation(progUV, 's'), 0);
  gl.uniform2i(gl.getUniformLocation(progUV, 'mx'), W - 1, H - 1);
  const scratch = newTex(gl.RGBA8, W, H);
  const fbConv = gl.createFramebuffer();
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const slots: Slot[] = [];
  for (let k = 0; k < RING; k++) slots.push({ y: newTex(gl.R8, W, H), c: newTex(gl.RG8, CW, CH), frame: -1 });
  if (gl.getError() === gl.OUT_OF_MEMORY) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw new Error('hero video: texture ring does not fit into graphics memory');
  }

  // ---- state
  const st: VideoStats = { resets: 0, configures: 0, maxOpen: 0, maxWorkMs: 0, over8: 0, texBytes: RING * SLOT + EXTRA, decoded: 0, misses: 0, segmentsLoaded: 0, bytesLoaded: 0 };
  const waiting: VideoFrame[] = [];
  let dead = false, dec: VideoDecoder | null = null, chainStart = -1, chainNext = -1, inflight = 0;
  let pushWait = false, held = 0, fed = 0, out = 0, chainBase = 0;
  let open = 0, lastOutput = 0, workAcc = 0, raf = 0, pumpQueued = false, active = 0, drawn = false;
  let sa = 0, sb = 0, sm = 0, pv = 0, dir = 1, ia = -1, ib = -1, it = 0, drawnKey = '', dirty = true;
  let uvr = [0, 0, 1, 1];

  const fail = (e: unknown) => {
    if (dead) return;
    dead = true;
    stop();
    try {
      o.onError(e);
    } catch {}
  };
  const guard = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      fail(e);
    }
  };
  const stop = () => {
    abort.abort();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    for (const f of waiting.splice(0)) f.close();
    if (dec && dec.state !== 'closed') {
      try {
        dec.close();
      } catch {}
    }
    dec = null;
    ro.disconnect();
  };

  const aim = (p: number) => {
    const l = locate(idx.pos, idx.grid, p, mode);
    sa = l.a;
    sb = l.b;
    sm = l.t;
    pv = sm < 0.5 ? sa : sb;
  };
  aim(o.window[0]);

  // ---- drawing (canvas fills the host like object-fit: cover, centred)
  const render = (a: Slot, b: Slot, t: number) => {
    gl.useProgram(progShow);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform4fv(uR, uvr);
    gl.uniform1f(uT, t);
    const tx = [a.y, a.c, b.y, b.c];
    for (let k = 0; k < 4; k++) {
      gl.activeTexture(gl.TEXTURE0 + k);
      gl.bindTexture(gl.TEXTURE_2D, tx[k]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const resize = () => {
    const cw = o.host.clientWidth || innerWidth, ch = o.host.clientHeight || innerHeight;
    // backing store: device pixels, but no denser than the video itself
    const k = Math.min(devicePixelRatio || 1, Math.max(1, 1 / Math.max(cw / W, ch / H)));
    const bw = Math.max(1, Math.round(cw * k)), bh = Math.max(1, Math.round(ch * k));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    // cropped like the WebP layers underneath (object-fit: cover at the focal point): the seam lines up
    const [fx, fy] = o.focal?.() ?? [0.5, 0.5];
    uvr = cropOf(bw, bh, W, H, fx, fy);
    dirty = true;
    // resizing clears the canvas: show the last drawn pair again (it is protected in the ring)
    if (ia >= 0 && where[ia] >= 0 && where[ib] >= 0) {
      render(slots[where[ia]], slots[where[ib]], it);
      dirty = false;
    }
  };
  const ro = new ResizeObserver(() => guard(resize));

  // ---- ring
  const wanted = (i: number) => i >= 0 && i <= last && where[i] < 0;
  const costOf = (i: number) => {
    const d = (i - pv) * dir;
    return d >= 0 ? d / AHEAD : -d / BEHIND;
  };
  // one decoded frame into a ring slot: RGBA scratch -> Y (full) + UV (2 x 2 mean) on the GPU
  const upload = (s: Slot, f: VideoFrame) => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scratch);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, f);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbConv);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, s.y, 0);
    gl.viewport(0, 0, W, H);
    gl.useProgram(progY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, s.c, 0);
    gl.viewport(0, 0, CW, CH);
    gl.useProgram(progUV);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  const store = (i: number, f: VideoFrame) => {
    if (!wanted(i)) return;
    let best = -1, bestCost = -1;
    for (let k = 0; k < slots.length; k++) {
      const fr = slots[k].frame;
      if (fr < 0) {
        best = k;
        bestCost = Infinity;
        break;
      }
      if (fr === ia || fr === ib || fr === sa || fr === sb) continue;
      const c = costOf(fr);
      if (c > bestCost) {
        bestCost = c;
        best = k;
      }
    }
    const ci = i === sa || i === sb ? -1 : costOf(i);
    if (best < 0 || ci >= bestCost) return;
    const s = slots[best];
    if (s.frame >= 0) where[s.frame] = -1;
    upload(s, f);
    s.frame = i;
    where[i] = best;
  };
  const consume = (f: VideoFrame, i: number) => {
    try {
      store(i, f);
    } finally {
      f.close();
      open--;
    }
  };

  // ---- decoding
  const loaded = (i: number) => data[segOf[i]] !== null;
  const chunk = (i: number) => new EncodedVideoChunk({ type: isKey[i] ? 'key' : 'delta', timestamp: i * TS, data: data[segOf[i]]!.subarray(offOf[i], offOf[i] + idx.sizes[i]) });
  const onFrame = (f: VideoFrame) => {
    if (dead) return f.close();
    const t0 = performance.now();
    open++;
    if (open > st.maxOpen) st.maxOpen = open;
    lastOutput = t0;
    pushWait = false;
    out++;
    if (held > 0) held--;
    else if (inflight > 0) inflight--;
    st.decoded++;
    const i = Math.round(f.timestamp / TS);
    if (wanted(i) && i !== sa && i !== sb && workAcc > BUDGET && waiting.length < MAX_WAIT) waiting.push(f); // upload in the next animation frame
    else guard(() => consume(f, i));
    schedulePump();
    kick();
    workAcc += performance.now() - t0;
  };
  const schedulePump = () => {
    if (pumpQueued || dead) return;
    pumpQueued = true;
    queueMicrotask(() => {
      pumpQueued = false;
      const t0 = performance.now();
      guard(pump);
      workAcc += performance.now() - t0;
    });
  };
  const makeDecoder = () => {
    const d = new VideoDecoder({ output: onFrame, error: (e) => fail(e) });
    d.configure(decoderConfig);
    st.configures++;
    d.addEventListener('dequeue', schedulePump);
    dec = d;
  };
  const feed = (d: VideoDecoder, limit: number) => {
    while (chainNext <= limit && chainNext <= last && loaded(chainNext) && inflight < MAX_INFLIGHT && d.decodeQueueSize < 4 && open < MAX_OPEN) {
      if (inflight === 0) lastOutput = performance.now();
      d.decode(chunk(chainNext++));
      fed++;
      inflight++;
    }
  };
  // The decoder holds its last frames until more chunks follow. One chunk at a time: the rest of the chain, or
  // the key frame of this chain again if the next chunk is past the end or not loaded. Unwanted outputs are dropped as usual.
  const push = (d: VideoDecoder, t: number) => {
    if (open >= MAX_OPEN || inflight >= MAX_INFLIGHT) return;
    if (chainNext > last || !loaded(chainNext)) {
      chainStart = chainNext = keyOf[t];
      chainBase = fed;
    }
    d.decode(chunk(chainNext++));
    fed++;
    inflight++;
    pushWait = true;
  };
  const need = (i: number) => where[i] < 0 && loaded(i);
  function pump() {
    const d = dec;
    if (dead || !d || pushWait || d.state !== 'configured') return;
    // first missing frame: the drawn pair, then ahead in scroll direction, then behind (only loaded data)
    let t = need(sa) ? sa : need(sb) ? sb : -1;
    for (let k = 1; t < 0 && k <= AHEAD; k++) {
      const v = pv + dir * k;
      if (v < 0 || v > last) break;
      if (need(v)) t = v;
    }
    for (let k = 1; t < 0 && k <= BEHIND; k++) {
      const v = pv - dir * k;
      if (v < 0 || v > last) break;
      if (need(v)) t = v;
    }
    if (t < 0) return;
    // forward: one long chain up to the front of the window; backward: one GOP at a time, its end pushed out by push()
    const forward = dir > 0 && t >= pv - 1;
    const limit = forward ? Math.min(last, pv + AHEAD) : t;
    if (chainNext >= 0 && t >= chainStart && t < chainNext) {
      // t is already in the decoder
      if (chainNext <= limit) return feed(d, limit);
      // something always stays inside, so what came out is told from the count (one output per chunk, in order)
      if (out <= chainBase + t - chainStart) {
        const urgent = !forward || Math.abs(t - pv) <= 2 || chainNext > last || performance.now() - lastOutput > STALL_MS;
        if (urgent && d.decodeQueueSize === 0) push(d, t);
        return;
      }
      chainStart = chainNext = -1; // it came out and was dropped: start over
    }
    const kt = keyOf[t];
    // jump: a new chain from the key frame before t; chunks still in flight run out (never reset, jump=keep)
    if (!(chainNext >= 0 && kt <= chainNext && chainNext <= t)) {
      chainStart = chainNext = kt;
      chainBase = fed;
    }
    feed(d, Math.max(limit, t));
  }

  // own animation frames while work is pending: waiting uploads within the budget, pump, stall check
  function kick() {
    if (!raf && !dead) raf = requestAnimationFrame(tick);
  }
  function tick() {
    raf = 0;
    if (dead) return;
    const t0 = performance.now();
    pushWait = false;
    guard(() => {
      for (let k = 0; waiting.length && (k === 0 || performance.now() - t0 < BUDGET); k++) {
        const f = waiting.shift()!;
        consume(f, Math.round(f.timestamp / TS));
      }
      pump();
      const d = dec;
      if (d && inflight > 0 && !pushWait && d.state === 'configured' && d.decodeQueueSize === 0 && performance.now() - lastOutput > STALL_MS) {
        // nothing to push for: what the decoder still holds is nobody's business, the next chain starts from a key frame
        held = inflight;
        inflight = 0;
        chainStart = chainNext = -1;
      }
    });
    if (dead) return;
    // main-thread work of this frame: this callback plus decoder outputs and pumps since the last one
    if (drawn) {
      const w = performance.now() - t0 + workAcc;
      if (w > st.maxWorkMs) st.maxWorkMs = w;
      if (w > 8) st.over8++;
    }
    workAcc = 0;
    if (waiting.length || inflight > 0) kick();
  }

  // ---- loading: segments in start-window order, at most MAX_FETCH at a time
  let queue = segmentOrder(idx.segments, idx.pos, idx.grid, o.window, o.window[0]);
  const started = new Uint8Array(idx.segments.length);
  // the start window loads alone: a segment beyond it would only share the line with it (M4, first swipe on a slow link)
  const isStart = (k: number) => inWindow(idx.segments[k], idx.pos, idx.grid, o.window);
  let startLeft = queue.filter(isStart).length;
  const fetchSegment = async (k: number) => {
    const s = idx.segments[k];
    const res = await fetch(dirUrl + s.file, { signal: abort.signal });
    if (!res.ok) throw new Error('hero video segment ' + s.file + ': HTTP ' + res.status);
    const b = new Uint8Array(await res.arrayBuffer());
    if (dead) return;
    if (b.byteLength !== s.bytes) throw new Error('hero video segment ' + s.file + ': ' + b.byteLength + ' bytes instead of ' + s.bytes);
    if (lenSize && !idrUnit(b, 0, idx.sizes[s.first], lenSize)) throw new Error('hero video segment ' + s.file + ' does not start with a key frame');
    data[k] = b;
    st.segmentsLoaded++;
    st.bytesLoaded += b.byteLength;
  };
  const pumpFetch = () => {
    while (!dead && active < MAX_FETCH && queue.length) {
      if (startLeft > 0 && !isStart(queue[0])) return;
      const k = queue.shift()!;
      if (started[k]) continue;
      started[k] = 1;
      active++;
      fetchSegment(k).then(
        () => {
          active--;
          if (dead) return;
          if (startLeft > 0 && isStart(k)) startLeft--;
          schedulePump();
          kick();
          pumpFetch();
        },
        (e) => {
          active--;
          fail(e);
        },
      );
    }
  };

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    fail(new Error('hero video: WebGL context lost'));
  });
  o.host.appendChild(canvas);
  ro.observe(o.host);
  resize();
  makeDecoder();
  pumpFetch();

  const stats = (): VideoStats => ({ ...st, maxWorkMs: Math.round(st.maxWorkMs * 100) / 100 });
  type Exposed = { __rsVideo?: () => VideoStats };
  if (q.get('vstats') === '1') (window as unknown as Exposed).__rsVideo = stats;

  const resident = (p: number) => {
    const l = locate(idx.pos, idx.grid, p, mode);
    return where[l.a] >= 0 && where[l.b] >= 0;
  };

  return {
    canvas,
    ready: (p) => !dead && covers(o.set, p) && resident(p),
    draw(p, d) {
      if (dead) return false;
      if (p > vfail) {
        vfail = Infinity;
        fail(new Error('hero video: artificial error (?vfail)'));
        return false;
      }
      const t0 = performance.now();
      if (d > 0) dir = 1;
      else if (d < 0) dir = -1;
      aim(p);
      schedulePump();
      kick();
      let ok = false;
      if (covers(o.set, p)) {
        ok = where[sa] >= 0 && where[sb] >= 0;
        if (!ok) st.misses++;
        else {
          const key = sa + ':' + sb + ':' + sm.toFixed(3);
          if (key !== drawnKey || dirty) {
            guard(() => render(slots[where[sa]], slots[where[sb]], sm));
            drawnKey = key;
            dirty = false;
            ia = sa;
            ib = sb;
            it = sm;
            drawn = true;
          }
          ok = !dead;
        }
      }
      workAcc += performance.now() - t0;
      return ok;
    },
    load(from) {
      if (dead) return;
      queue = segmentOrder(idx.segments, idx.pos, idx.grid, [from, from], from).filter((k) => !started[k]);
      startLeft = 0;
      pumpFetch();
    },
    stats,
    destroy() {
      if (!dead) {
        dead = true;
        stop();
      }
      const w = window as unknown as Exposed;
      if (w.__rsVideo === stats) delete w.__rsVideo;
      for (const s of slots) {
        gl.deleteTexture(s.y);
        gl.deleteTexture(s.c);
      }
      gl.deleteTexture(scratch);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };
}
