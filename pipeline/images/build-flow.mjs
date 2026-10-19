// Flow data for the scroll player (B1, docs/UEBERGABE-FLUESSIG.md): raw depth of web_depth.py
// (.raw/<variant>-depth/: NNNN.png 16-bit inverse depth + cams.json) → public/<hero base>/flow/ (base from src/data/hero-manifest.json, today /hero/5):
//   <variant>.json            cameras (12 numbers per position, null where missing) and the tile layout
//   <variant>-depth-NN.png    8-bit inverse depth, 8 x 8 tiles of gw x gh per sheet (64 positions)
// The maths (block median, u8 coding, rounding) lives in tools/qa/flow-warp.mjs, shared with the
// checks in tools/qa/flow-check.mjs, so what is measured is what is shipped. Deterministic: two runs give
// the same bytes (no dates, fixed PNG filter and zlib level). hero-manifest.json is not touched.
//
// node pipeline/images/build-flow.mjs --variant desktop|mobile --raw <depthdir> --out <dir>
//      [--grid WxH] [--base <dir of the motion set the F3 share refers to>]
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodeGray8 } from '../../tools/qa/png-lite.mjs';
import { GRID, rawToW, downscaleDepth, encodeDepth, camFromFrame, camRow } from '../../tools/qa/flow-warp.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COLS = 8, ROWS = 8, PER_SHEET = COLS * ROWS;
// F3: the flow data may add at most 15 % to the smallest motion set of the variant
const F3_LIMIT = 0.15;
const F3_BASE = { desktop: 'd-960', mobile: 'm-540' };

function args(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  return a;
}
const pad = (i, n = 4) => String(i).padStart(n, '0');

async function dirBytes(dir) {
  let sum = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    sum += e.isDirectory() ? await dirBytes(p) : (await stat(p)).size;
  }
  return sum;
}

export async function buildFlow({ variant, raw, out, grid, base }) {
  const cams = JSON.parse(await readFile(join(raw, 'cams.json'), 'utf8'));
  if (cams.variant && cams.variant !== variant) throw new Error(`cams.json is for ${cams.variant}, not ${variant}`);
  const [W, H] = cams.res, count = cams.count;
  const [gw, gh] = grid ?? GRID[variant];
  const sheets = Math.ceil(count / PER_SHEET);
  const sw = COLS * gw, sh = ROWS * gh;
  const pixels = Array.from({ length: sheets }, () => new Uint8Array(sw * sh));
  const rows = [];
  let present = 0;
  for (let i = 0; i < count; i++) {
    const fr = cams.frames?.[String(i)], file = join(raw, `${pad(i)}.png`);
    if (!fr || !existsSync(file)) { rows.push(null); continue; }
    const png = decodePNG(await readFile(file));
    if (png.bitDepth !== 16 || png.channels !== 1 || png.width !== W || png.height !== H) throw new Error(`${file}: expected 16-bit gray ${W}x${H}`);
    const { u8, dn, df } = encodeDepth(downscaleDepth(rawToW(png.data, fr.wmax), W, H, gw, gh));
    const s = Math.floor(i / PER_SHEET), k = i % PER_SHEET, x0 = (k % COLS) * gw, y0 = Math.floor(k / COLS) * gh;
    for (let y = 0; y < gh; y++) pixels[s].set(u8.subarray(y * gw, (y + 1) * gw), (y0 + y) * sw + x0);
    rows.push(camRow(camFromFrame(fr), dn, df));
    present++;
  }
  await mkdir(out, { recursive: true });
  const names = [];
  let bytes = 0;
  for (let s = 0; s < sheets; s++) {
    const name = `${variant}-depth-${pad(s, 2)}.png`;
    const buf = encodeGray8(sw, sh, pixels[s]);
    await writeFile(join(out, name), buf);
    names.push(name);
    bytes += buf.length;
  }
  const head = {
    version: 1, variant, count, fine: cams.fine, res: cams.res, sensor: cams.sensor, fit: cams.fit,
    depth: { w: gw, h: gh, cols: COLS, rows: ROWS, perSheet: PER_SHEET, encoding: 'invdepth-u8' }, sheets: names,
  };
  // one camera row per line: stable, readable diffs
  const json = `${JSON.stringify(head).slice(0, -1)},"cams":[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]}\n`;
  await writeFile(join(out, `${variant}.json`), json);
  bytes += Buffer.byteLength(json);
  // F3 refers to the published motion set of the current hero base (build-hero.mjs writes it to the manifest)
  const manifest = join(root, 'src', 'data', 'hero-manifest.json');
  const heroBase = existsSync(manifest) ? JSON.parse(await readFile(manifest, 'utf8')).base : null;
  const baseDir = base ?? (heroBase ? join(root, 'public', heroBase, F3_BASE[variant]) : null);
  const baseBytes = existsSync(baseDir) ? await dirBytes(baseDir) : null;
  return { variant, count, present, grid: [gw, gh], sheets, bytes, jsonBytes: Buffer.byteLength(json), baseDir, baseBytes, share: baseBytes ? bytes / baseBytes : null };
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const a = args(process.argv.slice(2));
  if (!a.variant || !a.raw || !a.out) {
    console.error('usage: build-flow.mjs --variant desktop|mobile --raw <depthdir> --out <dir> [--grid WxH] [--base <dir>]');
    process.exit(2);
  }
  const grid = a.grid ? a.grid.split('x').map(Number) : undefined;
  const r = await buildFlow({ variant: a.variant, raw: a.raw, out: a.out, grid, base: a.base });
  const mb = (n) => (n / 1e6).toFixed(3);
  console.log(`${r.variant}: ${r.present}/${r.count} positions, grid ${r.grid.join('x')}, ${r.sheets} sheets, ${mb(r.bytes)} MB (json ${(r.jsonBytes / 1e3).toFixed(1)} kB)`);
  if (r.baseBytes) console.log(`F3: ${(100 * r.share).toFixed(2)} % of ${r.baseDir} (${mb(r.baseBytes)} MB), limit ${100 * F3_LIMIT} % → ${r.share <= F3_LIMIT ? 'ok' : 'OVER'}`);
  else console.log(`F3: base ${r.baseDir} missing, share not computed`);
}
