// Flow warp for the hero journey (B1, docs/UEBERGABE-FLUESSIG.md).
//
// Between two rendered frames the cross-dissolve shows a double exposure where the camera moves fast.
// This module moves both frames into the camera of the position actually shown, using a coarse
// inverse-depth grid and the camera of every fine position (public/hero/<n>/flow/), and mixes them
// there. The maths is the CPU reference tools/qa/flow-warp.mjs; its FORMAT.md (T-20261018-08)
// describes the two passes. Whenever anything is missing the player simply keeps dissolving.
//
// The module has no side effects on import: tests run its pure parts in Node.

export type Tier = 'high' | 'medium' | 'low';
export type Cam = { loc: number[]; quat: number[]; lens: number; shift: number[] };
export type CamRow = number[] | null;
export type FlowMeta = {
  variant: 'desktop' | 'mobile';
  count: number;
  res: [number, number];
  sensor: number;
  fit: string;
  depth: { w: number; h: number; cols: number; rows: number; perSheet: number };
  sheets: string[];
  cams: CamRow[];
};

// ---------------------------------------------------------------- constants (same as flow-warp.mjs)
export const RATIO_LO = 0.75;
export const RATIO_HI = 0.9;
export const STRETCH_LO = 1.5;
export const STRETCH_HI = 3.0;
export const G_MIN = 0.01;
export const MIX_EPS = 1e-4;
export const ZC_MIN = 1e-6;
export const UV_TOL = 1e-4;
// R7: a warp that costs the device its frame rate is worse than a dissolve
export const SLOW_FRAME_MS = 22;
export const WATCH_MS = 2000;
export const GAP_MS = 250; // longer intervals are pauses (tab in the background), not slow frames
// R7 relative to the display's own rate: 22 ms hold up to this interval (60 Hz), beyond it scaled alike
export const BASE_REF_MS = 16.7;
export const BASE_SAMPLES = 30;

// ---------------------------------------------------------------- camera
export const camOf = (r: number[]) => ({ loc: r.slice(0, 3), quat: r.slice(3, 7), lens: r[7], shift: [r[8], r[9]], dn: r[10], df: r[11] });

/** Rotation matrix (row-major 3x3, world ← camera) of a quaternion [w, x, y, z]. */
export function quatToMat([w, x, y, z]: number[]) {
  const n = Math.hypot(w, x, y, z) || 1;
  w /= n; x /= n; y /= n; z /= n;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
  ];
}

/** Shortest-path spherical interpolation of unit quaternions. */
export function slerp(qa: number[], qb: number[], t: number) {
  let d = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3];
  let b = qb;
  if (d < 0) { d = -d; b = qb.map((v) => -v); }
  let ka: number, kb: number;
  if (d > 0.9995) { ka = 1 - t; kb = t; }
  else {
    const th = Math.acos(d), s = Math.sin(th);
    ka = Math.sin((1 - t) * th) / s; kb = Math.sin(t * th) / s;
  }
  const q = [0, 1, 2, 3].map((i) => ka * qa[i] + kb * b[i]);
  const n = Math.hypot(...q);
  return q.map((v) => v / n);
}

export function interpCam(a: Cam, b: Cam, t: number): Cam {
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    loc: [0, 1, 2].map((i) => lerp(a.loc[i], b.loc[i])),
    quat: slerp(a.quat, b.quat, t),
    lens: lerp(a.lens, b.lens),
    shift: [lerp(a.shift[0], b.shift[0]), lerp(a.shift[1], b.shift[1])],
  };
}

/**
 * Camera of the picture shown at a position. The camera move is known at every fine position; the
 * frames in play may be further apart (coarser levels at speed), so the camera is never taken from
 * them but from the two fine positions around the position.
 */
export function targetCam(cams: CamRow[], position: number): Cam | null {
  const last = cams.length - 1;
  const p = Math.min(last, Math.max(0, position));
  const i = Math.min(last, Math.floor(p));
  const f = p - i;
  const a = cams[i];
  if (!a) return null;
  if (f === 0 || i === last) return camOf(a);
  const b = cams[i + 1];
  return b ? interpCam(camOf(a), camOf(b), f) : null;
}

export function intrinsics(cam: Cam, meta: Pick<FlowMeta, 'res' | 'sensor' | 'fit'>) {
  const [W, H] = meta.res;
  const L = meta.fit === 'HORIZONTAL' ? W : meta.fit === 'VERTICAL' ? H : Math.max(W, H);
  return [(cam.lens / (meta.sensor || 36)) * L, W / 2 - cam.shift[0] * L, H / 2 + cam.shift[1] * L];
}

export type Uniforms = { M: number[]; tv: number[]; ks: number[]; kt: number[] };

/** Per source: M = Rtᵀ·Rs (row-major), tv = Rtᵀ·(locS − locT), intrinsics [f, cx, cy] of both. */
export function uniformsFor(src: Cam, dst: Cam, meta: Pick<FlowMeta, 'res' | 'sensor' | 'fit'>): Uniforms {
  const Rs = quatToMat(src.quat), Rt = quatToMat(dst.quat);
  const M: number[] = [], tv: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) M[3 * r + c] = Rt[r] * Rs[c] + Rt[3 + r] * Rs[3 + c] + Rt[6 + r] * Rs[6 + c];
    tv[r] = Rt[r] * (src.loc[0] - dst.loc[0]) + Rt[3 + r] * (src.loc[1] - dst.loc[1]) + Rt[6 + r] * (src.loc[2] - dst.loc[2]);
  }
  return { M, tv, ks: intrinsics(src, meta), kt: intrinsics(dst, meta) };
}

/** What the vertex shader does with one source pixel (x, y) of inverse depth w: [u, v, z, wt]. */
export function warpPoint({ M, tv, ks, kt }: Uniforms, x: number, y: number, w: number) {
  const dx = (x - ks[1]) / ks[0], dy = -(y - ks[2]) / ks[0];
  const cx = M[0] * dx + M[1] * dy - M[2] + w * tv[0];
  const cy = M[3] * dx + M[4] * dy - M[5] + w * tv[1];
  const z = -(M[6] * dx + M[7] * dy - M[8] + w * tv[2]);
  return [kt[1] + (kt[0] * cx) / z, kt[2] - (kt[0] * cy) / z, z, w / z];
}

// ---------------------------------------------------------------- depth sheets
/** Sheet and texel origin of the depth tile of position i. */
export function tileOf(i: number, depth: FlowMeta['depth']) {
  const k = i % depth.perSheet;
  return { sheet: Math.floor(i / depth.perSheet), x: (k % depth.cols) * depth.w, y: Math.floor(k / depth.cols) * depth.h };
}

/** u8 code → inverse depth: 0 is the background, 1…255 run linearly from far (df) to near (dn). */
export const decodeW = (v: number, dn: number, df: number) => (v === 0 ? 0 : dn === df ? dn : df + ((v - 1) / 254) * (dn - df));

/** The flow file of a variant, checked against the motion set it is meant for; null if it does not fit (R2). */
export function parseMeta(json: unknown, variant: string, count: number): FlowMeta | null {
  const m = json as FlowMeta & { version?: number };
  const int = (x: unknown) => Number.isInteger(x) && (x as number) > 0;
  try {
    if (m.version !== 1 || m.variant !== variant || m.count !== count) return null;
    if (!int(m.res[0]) || !int(m.res[1]) || !(m.sensor > 0)) return null;
    const d = m.depth;
    if (!int(d.w) || !int(d.h) || !int(d.cols) || !int(d.rows) || d.perSheet !== d.cols * d.rows) return null;
    if (m.sheets.length !== Math.ceil(count / d.perSheet) || m.cams.length !== count) return null;
    for (const row of m.cams) if (row !== null && !(row.length === 12 && row.every(Number.isFinite))) return null;
    return m;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- mode
export type ModeInput = {
  off: boolean; // ?flow=off (U4)
  tier: Tier; // R5: low
  gl: boolean; // R1: WebGL2, shaders, program and render targets all came up
  lost: boolean; // R4
  data: 'idle' | 'loading' | 'ready' | 'failed'; // R2
  pair: boolean; // R3: both depth tiles and the cameras of the pair are there
  slow: boolean; // R7
};

/** Whether a frame is warped or dissolved as before. */
export function flowMode(s: ModeInput): 'warp' | 'fade' {
  return !s.off && s.tier !== 'low' && s.gl && !s.lost && s.data === 'ready' && s.pair && !s.slow ? 'warp' : 'fade';
}

/** Whether the flow data is worth asking for at all (no request on R1, R5 and with ?flow=off). */
export const flowWanted = (s: Pick<ModeInput, 'off' | 'tier' | 'gl'>) => !s.off && s.tier !== 'low' && s.gl;

/**
 * R7 limit for the display's base interval g in ms: SLOW_FRAME_MS up to BASE_REF_MS (60 Hz and
 * faster), beyond that the same tolerance, 22 / 16.7 ≈ 1.32 × g (about 44 ms at 30 Hz). Without g, 22 ms.
 */
export const slowLimit = (g: number | null) => (g !== null && g > BASE_REF_MS ? SLOW_FRAME_MS * (g / BASE_REF_MS) : SLOW_FRAME_MS);

/**
 * Base interval of the display for R7, from a short rAF run of the flow's own (createFlow, from
 * load() on). Counts BASE_SAMPLES intervals, but none in which a warped frame was drawn, nor the
 * one after it, nor gaps over GAP_MS; then it is done and stays (no new run when the rate changes).
 * The base is the lower quarter of them: load only ever lengthens an interval.
 */
export function createBase(samples = BASE_SAMPLES) {
  const gaps: number[] = [];
  let last = -1;
  let skip = 0;
  let value: number | null = null;
  return {
    /** The base interval in ms, null until measured. */
    get value() {
      return value;
    },
    /** A warped frame was drawn: this interval and the next do not count. */
    warped() {
      skip = 2;
    },
    /** One tick of the run; true once the base is known and no further frame is needed. */
    tick(time: number) {
      if (value !== null) return true;
      const gap = last < 0 ? -1 : time - last;
      last = time;
      if (gap < 0) return false;
      if (skip > 0) {
        skip--;
        return false;
      }
      if (gap > GAP_MS) return false;
      gaps.push(gap);
      if (gaps.length < samples) return false;
      value = gaps.sort((x, y) => x - y)[Math.ceil(gaps.length / 4) - 1];
      return true;
    },
  };
}

/**
 * R7 watchdog over the warped frames: trips once the mean interval of the last WATCH_MS is above
 * the limit (a number or read on every tick, see slowLimit). A pause (the camera came to rest, a
 * dissolved frame in between) starts over.
 */
export function createWatch(limit: number | (() => number) = SLOW_FRAME_MS, span = WATCH_MS) {
  const max = typeof limit === 'number' ? () => limit : limit;
  const gaps: number[] = [];
  let last = -1;
  let sum = 0;
  let tripped = false;
  return {
    get tripped() {
      return tripped;
    },
    tick(time: number) {
      if (tripped) return true;
      const gap = last < 0 ? -1 : time - last;
      last = time;
      if (gap < 0 || gap > GAP_MS) {
        gaps.length = 0;
        sum = 0;
        return false;
      }
      gaps.push(gap);
      sum += gap;
      while (gaps.length > 1 && sum - gaps[0] >= span) sum -= gaps.shift()!;
      if (sum >= span && sum / gaps.length > max()) tripped = true;
      return tripped;
    },
    pause() {
      last = -1;
    },
  };
}

// ---------------------------------------------------------------- WebGL2
const glsl = (x: number) => (/[.e]/.test(String(x)) ? String(x) : `${x}.0`);
const CONSTANTS = `
const float RATIO_LO = ${glsl(RATIO_LO)}, RATIO_HI = ${glsl(RATIO_HI)}, STRETCH_LO = ${glsl(STRETCH_LO)}, STRETCH_HI = ${glsl(STRETCH_HI)};
const float G_MIN = ${glsl(G_MIN)}, MIX_EPS = ${glsl(MIX_EPS)}, ZC_MIN = ${glsl(ZC_MIN)}, UV_TOL = ${glsl(UV_TOL)};`;

// Pass 1: one source into the target camera. Unindexed grid: vertex id → cell, triangle, corner.
// Every vertex evaluates all three corners of its triangle, so the validity g is the same on all three.
const WARP_VS = `#version 300 es
precision highp float;
precision highp int;
${CONSTANTS}
uniform highp sampler2D uDepth;
uniform ivec2 uTile, uGrid;
uniform vec2 uRes, uNearFar;
uniform vec3 uKs, uKt, uTv;
uniform mat3 uM;
uniform float uWS;
out vec2 vUv;
flat out float vG;

vec4 corner(int a, int b, out vec2 src, out float w) {
  float x = a == 0 ? 0.0 : a == uGrid.x + 1 ? uRes.x : (float(a) - 0.5) * uRes.x / float(uGrid.x);
  float y = b == 0 ? 0.0 : b == uGrid.y + 1 ? uRes.y : (float(b) - 0.5) * uRes.y / float(uGrid.y);
  float v = floor(texelFetch(uDepth, uTile + clamp(ivec2(a, b) - 1, ivec2(0), uGrid - 1), 0).r * 255.0 + 0.5);
  w = v == 0.0 ? 0.0 : uNearFar.x == uNearFar.y ? uNearFar.x : uNearFar.y + (v - 1.0) / 254.0 * (uNearFar.x - uNearFar.y);
  vec3 c = uM * vec3((x - uKs.y) / uKs.x, -(y - uKs.z) / uKs.x, -1.0) + w * uTv;
  float z = -c.z;
  src = vec2(x, y);
  return vec4(uKt.y + uKt.x * c.x / z, uKt.z - uKt.x * c.y / z, z, w / z);
}

float area(vec2 p, vec2 q, vec2 r) { return abs((q.x - p.x) * (r.y - p.y) - (r.x - p.x) * (q.y - p.y)); }

void main() {
  int tri = gl_VertexID / 3, k = gl_VertexID - tri * 3, cell = tri / 2;
  int a = cell % (uGrid.x + 1), b = cell / (uGrid.x + 1);
  // fixed diagonal as in the reference: triangle 0 = 00, 10, 11; triangle 1 = 00, 11, 01
  ivec2 o1 = (tri & 1) == 0 ? ivec2(1, 0) : ivec2(1, 1);
  ivec2 o2 = (tri & 1) == 0 ? ivec2(1, 1) : ivec2(0, 1);
  vec2 s0, s1, s2;
  float w0, w1, w2;
  vec4 p0 = corner(a, b, s0, w0), p1 = corner(a + o1.x, b + o1.y, s1, w1), p2 = corner(a + o2.x, b + o2.y, s2, w2);
  vUv = vec2(0.0);
  vG = 0.0;
  if (!(p0.z > ZC_MIN && p1.z > ZC_MIN && p2.z > ZC_MIN)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  int nz = int(w0 > 0.0) + int(w1 > 0.0) + int(w2 > 0.0);
  float gr = nz == 0 ? 1.0 : nz < 3 ? 0.0 : smoothstep(RATIO_LO, RATIO_HI, min(w0, min(w1, w2)) / max(w0, max(w1, w2)));
  float stretch = area(p0.xy, p1.xy, p2.xy) / area(s0, s1, s2);
  vG = max(G_MIN, gr * (1.0 - smoothstep(STRETCH_LO, STRETCH_HI, stretch)));
  vec4 p = k == 0 ? p0 : k == 1 ? p1 : p2;
  vUv = (k == 0 ? s0 : k == 1 ? s1 : s2) / uRes;
  // clip w = homogeneous target depth: the UV is interpolated exactly like the reference
  gl_Position = vec4((2.0 * p.x / uRes.x - 1.0) * p.z, (1.0 - 2.0 * p.y / uRes.y) * p.z, (0.5 - p.w / uWS) * p.z, p.z);
}`;

const WARP_FS = `#version 300 es
precision highp float;
${CONSTANTS}
uniform sampler2D uSrc;
in vec2 vUv;
flat in float vG;
out vec4 color;
void main() {
  if (any(lessThan(vUv, vec2(-UV_TOL))) || any(greaterThan(vUv, vec2(1.0 + UV_TOL)))) discard;
  color = vec4(texture(uSrc, vUv).rgb, vG);
}`;

const MIX_VS = `#version 300 es
void main() { gl_Position = vec4(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0, 0.0, 1.0); }`;

// Pass 2: weighted by validity and t; where neither source covers a pixel, today's dissolve.
const MIX_FS = `#version 300 es
precision highp float;
${CONSTANTS}
uniform sampler2D uWarpA, uWarpB, uImgA, uImgB;
uniform float uT;
uniform vec2 uOut;
out vec4 color;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(uWarpA, p, 0), b = texelFetch(uWarpB, p, 0);
  float wa = a.a * (1.0 - uT), wb = b.a * uT, den = wa + wb;
  if (den < MIX_EPS) {
    vec2 q = vec2(gl_FragCoord.x, uOut.y - gl_FragCoord.y) / uOut;
    color = vec4(mix(texture(uImgA, q).rgb, texture(uImgB, q).rgb, uT), 1.0);
  } else color = vec4((wa * a.rgb + wb * b.rgb) / den, 1.0);
}`;

type Gl = WebGL2RenderingContext;
export type Source = { image: TexImageSource & { width: number; height: number }; row: number[]; sheet: WebGLTexture; tile: { x: number; y: number } };

/** Program objects compile in the background where the browser can (KHR_parallel_shader_compile). */
function compile(gl: Gl, vs: string, fs: string) {
  const program = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return program;
}

function linked(gl: Gl, program: WebGLProgram) {
  for (const shader of gl.getAttachedShaders(program) ?? []) if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return false;
  return Boolean(gl.getProgramParameter(program, gl.LINK_STATUS));
}

function texture(gl: Gl, filter: number) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/**
 * The two passes on a canvas. Resolves to null when WebGL2, the programs or the render targets do
 * not come up (R1); nothing is requested in that case.
 */
export async function createRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const warp = compile(gl, WARP_VS, WARP_FS);
  const mixer = compile(gl, MIX_VS, MIX_FS);
  if (parallel)
    for (let i = 0; i < 600 && !(gl.getProgramParameter(warp, parallel.COMPLETION_STATUS_KHR) && gl.getProgramParameter(mixer, parallel.COMPLETION_STATUS_KHR)); i++)
      await new Promise((r) => setTimeout(r, 16));
  if (gl.isContextLost() || !linked(gl, warp) || !linked(gl, mixer)) return null;

  // render targets of pass 1: half float where it can be drawn into, else 8 bit (g then in steps of 1/255)
  const half = Boolean(gl.getExtension('EXT_color_buffer_float'));
  const targets = [0, 1].map(() => ({ tex: texture(gl, gl.NEAREST), fbo: gl.createFramebuffer()! }));
  const depth = gl.createRenderbuffer()!;
  let width = 0;
  let height = 0;
  function size(w: number, h: number) {
    if (w === width && h === height) return true;
    width = canvas.width = w;
    height = canvas.height = h;
    gl!.bindRenderbuffer(gl!.RENDERBUFFER, depth);
    gl!.renderbufferStorage(gl!.RENDERBUFFER, gl!.DEPTH_COMPONENT24, w, h);
    for (const t of targets) {
      gl!.bindTexture(gl!.TEXTURE_2D, t.tex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, half ? gl!.RGBA16F : gl!.RGBA8, w, h, 0, gl!.RGBA, half ? gl!.HALF_FLOAT : gl!.UNSIGNED_BYTE, null);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, t.fbo);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, t.tex, 0);
      gl!.framebufferRenderbuffer(gl!.FRAMEBUFFER, gl!.DEPTH_ATTACHMENT, gl!.RENDERBUFFER, depth);
      if (gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) !== gl!.FRAMEBUFFER_COMPLETE) return false;
    }
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    return true;
  }
  if (!size(16, 16)) return null;

  const where = (program: WebGLProgram, names: string[]) => Object.fromEntries(names.map((n) => [n, gl!.getUniformLocation(program, n)]));
  const uw = where(warp, ['uDepth', 'uTile', 'uGrid', 'uRes', 'uNearFar', 'uKs', 'uKt', 'uTv', 'uM', 'uWS', 'uSrc']);
  const um = where(mixer, ['uWarpA', 'uWarpB', 'uImgA', 'uImgB', 'uT', 'uOut']);
  gl.useProgram(mixer);
  [um.uWarpA, um.uWarpB, um.uImgA, um.uImgB].forEach((loc, unit) => gl!.uniform1i(loc, unit));
  gl.useProgram(warp);
  gl.uniform1i(uw.uSrc, 0);
  gl.uniform1i(uw.uDepth, 1);

  // frame textures, matched by the bitmap they hold: the two in play and the two before
  const frames: { image: TexImageSource; tex: WebGLTexture }[] = [];
  function frameTexture(image: TexImageSource) {
    const at = frames.findIndex((f) => f.image === image);
    if (at >= 0) {
      const [hit] = frames.splice(at, 1);
      frames.unshift(hit);
      return hit.tex;
    }
    const tex = frames.length >= 4 ? frames.pop()!.tex : texture(gl!, gl!.LINEAR);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, gl!.RGBA, gl!.UNSIGNED_BYTE, image);
    frames.unshift({ image, tex });
    return tex;
  }

  return {
    gl,
    half,
    /** A depth sheet as an R8 texture, read with texelFetch. */
    sheet(image: TexImageSource) {
      const tex = texture(gl, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, image);
      return tex;
    },
    /** Draws the in-between at t of A and B in camera camT at w × h pixels. */
    render(meta: FlowMeta, A: Source, B: Source, camT: Cam, t: number, w: number, h: number) {
      if (gl.isContextLost() || !size(w, h)) return false;
      const ws = 2 * Math.max(A.row[10], B.row[10]);
      const imgA = frameTexture(A.image), imgB = frameTexture(B.image);
      gl.useProgram(warp);
      gl.viewport(0, 0, w, h);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.uniform2i(uw.uGrid, meta.depth.w, meta.depth.h);
      gl.uniform2f(uw.uRes, meta.res[0], meta.res[1]);
      gl.uniform1f(uw.uWS, ws);
      [A, B].forEach((src, i) => {
        const U = uniformsFor(camOf(src.row), camT, meta);
        gl.bindFramebuffer(gl.FRAMEBUFFER, targets[i].fbo);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, i ? imgB : imgA);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, src.sheet);
        gl.uniform2i(uw.uTile, src.tile.x, src.tile.y);
        gl.uniform2f(uw.uNearFar, src.row[10], src.row[11]);
        gl.uniform3fv(uw.uKs, U.ks);
        gl.uniform3fv(uw.uKt, U.kt);
        gl.uniform3fv(uw.uTv, U.tv);
        gl.uniformMatrix3fv(uw.uM, true, U.M);
        gl.drawArrays(gl.TRIANGLES, 0, (meta.depth.w + 1) * (meta.depth.h + 1) * 6);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(mixer);
      [targets[0].tex, targets[1].tex, imgA, imgB].forEach((tex, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
      });
      gl.uniform1f(um.uT, t);
      gl.uniform2f(um.uOut, w, h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    },
  };
}

export type Renderer = NonNullable<Awaited<ReturnType<typeof createRenderer>>>;

// ---------------------------------------------------------------- player
type VariantData = { status: ModeInput['data']; meta: FlowMeta | null; sheets: (WebGLTexture | null | undefined)[] };

/**
 * The warp as journey.ts uses it. A canvas cloned from the frame layers lies over them and is shown
 * only while it holds an in-between; at rest the layers below show the frame itself, as before.
 * Returns null where the warp is not used at all: ?flow=off and the low tier.
 */
export function createFlow({ film, template, base, tier, search }: { film: HTMLElement; template: HTMLCanvasElement; base: string; tier: Tier; search: string }) {
  const off = new URLSearchParams(search).get('flow') === 'off';
  if (!flowWanted({ off, tier, gl: true })) return null;

  let gl: 'pending' | 'ok' | 'none' = 'pending';
  let renderer: Renderer | null = null;
  let lost = false;
  let starting: Promise<void> | null = null;
  const data = new Map<string, VariantData>();
  // R7 against the display's own rate, measured once from load() on (createBase)
  const rate = createBase();
  const watch = createWatch(() => slowLimit(rate.value));
  let measuring = false;
  const measure = (time: number) => {
    if (!rate.tick(time)) requestAnimationFrame(measure);
  };
  const canvas = template.cloneNode(false) as HTMLCanvasElement;
  canvas.removeAttribute('data-journey-layer');
  canvas.removeAttribute('style');
  canvas.style.opacity = '0';
  let visible = false;
  let state = '';

  function show(on: boolean, now: string) {
    if (on !== visible) {
      visible = on;
      canvas.style.opacity = on ? '1' : '0';
    }
    // what the stage shows, for measurements: warp, fade (moving, dissolved) or rest
    if (now !== state) canvas.dataset.journeyFlow = state = now;
  }

  canvas.addEventListener('webglcontextlost', () => {
    // R4: the layers below are always up to date, they take over in this very frame
    lost = true;
    show(false, 'fade');
  });

  async function fetchVariant(variant: string, count: number, position: number) {
    const entry: VariantData = { status: 'loading', meta: null, sheets: [] };
    data.set(variant, entry);
    try {
      const response = await fetch(`${base}/flow/${variant}.json`, { priority: 'low' } as RequestInit);
      entry.meta = response.ok ? parseMeta(await response.json(), variant, count) : null;
    } catch {
      entry.meta = null;
    }
    const meta = entry.meta;
    if (!meta || !renderer) {
      entry.status = 'failed';
      return;
    }
    entry.status = 'ready';
    // nearest sheets to the camera first, two at a time
    const here = tileOf(Math.round(position), meta.depth).sheet;
    const order = meta.sheets.map((_, i) => i).sort((a, b) => Math.abs(a - here) - Math.abs(b - here) || b - a);
    const workers = [0, 1].map(async () => {
      while (order.length) {
        const i = order.shift()!;
        try {
          const response = await fetch(`${base}/flow/${meta.sheets[i]}`, { priority: 'low' } as RequestInit);
          if (!response.ok) throw new Error(String(response.status));
          const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
          if (!lost) entry.sheets[i] = renderer!.sheet(bitmap);
          bitmap.close();
        } catch {
          entry.sheets[i] = null; // R3 for the pairs on this sheet
        }
      }
    });
    await Promise.all(workers);
  }

  return {
    canvas,
    /** The first loading stage of the frames is in: the warp may come up now, then its data. */
    load(variant: string, count: number, position: number) {
      if (!measuring) {
        measuring = true;
        requestAnimationFrame(measure);
      }
      starting ??= (async () => {
        const made = await createRenderer(canvas).catch(() => null);
        gl = made ? 'ok' : 'none';
        renderer = made;
        if (made) film.append(canvas);
      })();
      void starting.then(() => {
        if (gl === 'ok' && !lost && !data.has(variant)) void fetchVariant(variant, count, position);
      });
    },
    /** Shows the in-between of frames a and b at the position, if it can (else the layers below dissolve). */
    draw(variant: string, position: number, a: number, frameA: ImageBitmap, b: number, frameB: ImageBitmap, mix: number, time: number) {
      if (a === b || !(mix > 0 && mix < 1)) {
        watch.pause();
        return show(false, 'rest');
      }
      const entry = data.get(variant);
      const meta = entry?.meta;
      const rowA = meta?.cams[a], rowB = meta?.cams[b];
      const tileA = meta ? tileOf(a, meta.depth) : null, tileB = meta ? tileOf(b, meta.depth) : null;
      const sheetA = tileA && entry!.sheets[tileA.sheet], sheetB = tileB && entry!.sheets[tileB.sheet];
      const camT = meta ? targetCam(meta.cams, position) : null;
      const pair = Boolean(rowA && rowB && sheetA && sheetB && camT);
      const mode = flowMode({ off, tier, gl: gl === 'ok', lost: lost || Boolean(renderer?.gl.isContextLost()), data: entry?.status ?? 'idle', pair, slow: watch.tripped });
      if (mode !== 'warp' || watch.tick(time)) {
        watch.pause();
        return show(false, 'fade');
      }
      const big = frameB.width > frameA.width ? frameB : frameA;
      const done = renderer!.render(meta!, { image: frameA, row: rowA!, sheet: sheetA!, tile: tileA! }, { image: frameB, row: rowB!, sheet: sheetB!, tile: tileB! }, camT!, mix, big.width, big.height);
      if (done) rate.warped();
      show(done, done ? 'warp' : 'fade');
    },
    /** Nothing to warp: the nearest frame is shown unwarped, or the stage fell back to the posters. */
    hide() {
      watch.pause();
      show(false, 'fade');
    },
  };
}
