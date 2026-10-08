// Hero delivery: Blender PNG frames -> public/hero/3/<set>/NNNN.webp plus a manifest the page
// reads at build time. Frames are WebP on purpose: the sequence is scrubbed, so decode speed
// matters more than the last few kilobytes (AVIF decodes ~3x slower).
//
// Frame grid. Each camera move was first rendered at its base positions (.raw/<variant>/NNNN.png,
// desktop 90, mobile 64) in full resolution. 90 pictures are too few for a move that should read
// as continuous: in-between frames are rendered on a grid FINE times as dense
// (.raw/<variant>-fine/NNNN.png, fine index), at the size of the motion set.
// Published files are named by fine index, so base frame i becomes i * FINE.
//
// Two kinds of sets:
//   motion  d-1440m, m-720m: every frame, large. Drawn while the camera moves on capable devices with
//           large screens (src/scripts/journey.ts).
//           d-960, m-540: the same frames, smaller. Drawn while the camera moves everywhere else.
//   rest    d-1440, d-1920, m-720: base frames only, full resolution. Shown once the camera rests.
// The manifest lists which positions exist in each set.
//
// In-between sizes. The in-betweens were first rendered at the size of the small motion sets
// (.raw/<variant>-fine and -blur: 960 x 540, 540 x 960). On a 2560 px laptop panel those were
// stretched 2.7 times and read as soft and blocky while scrolling, so they are rendered again at
// 1440 x 810 and 720 x 1280 (.raw/<variant>-fine-<width>, -blur-<width>; queue-large.sh). Where both
// exist the larger render wins in every set: a small set is then scaled down from it like the base
// frames, and all its frames are equally sharp. Until the large renders are complete, a large motion
// set carries small frames where they are missing (reported as "still small").
//
// Where the camera travels fast, the motion sets use frames rendered with motion blur
// (.raw/<variant>-blur/NNNN.png, any position including base positions): like film, a fast pan is
// smeared along its travel instead of showing sharp pictures far apart. Sharp frames stay in the
// rest sets, so a settled picture is never a blurred one. RS_NO_BLUR=1 builds without them.
//
// The dwell at the stigma hold (.raw/<variant>-hold/NNNN.png, every position of the grid there):
// sharp frames, larger than the rest of the motion set. In the motion sets they win over every
// other source and are published at up to HOLD_WIDTH.
import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const raw = join(root, '.raw');
// The generation of the published frames. Frames are cached for a week by name: count it up
// whenever published pictures change.
// "4": the stigma hold was rendered again on 2026-10-06 (same names, new pictures).
// "5": in-betweens rendered again at 1440 / 720 px, the small sets are scaled down from them (2026-10-06).
const BASE_PATH = '/hero/5';
const out = join(root, 'public', 'hero', '5');

const FINE = 8;
// Base frame counts of the authored camera moves (pipeline/blender/web_hero.py, --frames).
const BASE = { desktop: 90, mobile: 64 };
// width of the large in-between renders (folder suffix)
const LARGE = { desktop: 1440, mobile: 720 };

// set name -> source variant, largest delivered width, quality.
// The landscape product reveal (base frames 55+) is rendered at 1920 px; d-1920 passes that through,
// the other landscape sets scale everything down.
const SETS = [
  { name: 'd-1920', variant: 'desktop', width: 1920, quality: 80, role: 'rest' },
  { name: 'd-1440', variant: 'desktop', width: 1440, quality: 80, role: 'rest' },
  { name: 'd-1440m', variant: 'desktop', width: 1440, quality: 80, role: 'motion' },
  { name: 'd-960', variant: 'desktop', width: 960, quality: 76, role: 'motion' },
  { name: 'm-720', variant: 'mobile', width: 720, quality: 80, role: 'rest' },
  { name: 'm-720m', variant: 'mobile', width: 720, quality: 80, role: 'motion' },
  { name: 'm-540', variant: 'mobile', width: 540, quality: 76, role: 'motion' },
];

const HOLD_WIDTH = { desktop: 1440, mobile: 720 };

const pad = (i) => String(i).padStart(4, '0');
const numbered = async (dir) => (existsSync(dir) ? (await readdir(dir)).filter((f) => /^\d{4}\.png$/.test(f)).map((f) => Number(f.slice(0, 4))) : []);

/**
 * Fine index -> source file for one variant. A base frame wins over a fine frame at the same position,
 * a large in-between render over a small one.
 */
async function sources(variant) {
  const count = (BASE[variant] - 1) * FINE + 1;
  const map = new Map();
  for (const dir of [`${variant}-fine`, `${variant}-fine-${LARGE[variant]}`]) for (const i of await numbered(join(raw, dir))) if (i < count) map.set(i, join(raw, dir, `${pad(i)}.png`));
  for (const i of await numbered(join(raw, variant))) if (i < BASE[variant]) map.set(i * FINE, join(raw, variant, `${pad(i)}.png`));
  const blur = new Map();
  if (!process.env.RS_NO_BLUR) for (const dir of [`${variant}-blur`, `${variant}-blur-${LARGE[variant]}`]) for (const i of await numbered(join(raw, dir))) if (i < count) blur.set(i, join(raw, dir, `${pad(i)}.png`));
  const hold = new Map();
  for (const i of await numbered(join(raw, `${variant}-hold`))) if (i < count) hold.set(i, join(raw, `${variant}-hold`, `${pad(i)}.png`));
  return { count, map, blur, hold };
}

/** Sorted indices as [first, last, stride] runs: compact in the page, trivial to expand. */
function runs(indices) {
  const list = [];
  for (let i = 0; i < indices.length; ) {
    const stride = i + 1 < indices.length ? indices[i + 1] - indices[i] : 1;
    let j = i;
    while (j + 1 < indices.length && indices[j + 1] - indices[j] === stride) j++;
    list.push([indices[i], indices[j], j === i ? 1 : stride]);
    i = j + 1;
  }
  return list;
}

const manifest = { generated: new Date().toISOString(), base: BASE_PATH, fine: FINE, sets: {} };
const manifestFile = join(root, 'src', 'data', 'hero-manifest.json');
const previous = existsSync(manifestFile) ? JSON.parse(await readFile(manifestFile, 'utf8')) : { sets: {} };
let incomplete = false;
const cache = {};
// which source each published frame was made from: a frame is converted again when that changes
const ledgerFile = join(raw, 'hero-sources.json');
const ledger = existsSync(ledgerFile) ? JSON.parse(await readFile(ledgerFile, 'utf8')) : {};

for (const set of SETS) {
  const { count, map, blur, hold } = (cache[set.variant] ??= await sources(set.variant));
  if (!map.size && !previous.sets[set.name]) continue;
  // hold frames after blurred ones: the later entry wins
  const moving = set.role === 'motion' ? new Map([...blur, ...hold]) : new Map();
  const dwell = set.role === 'motion' ? hold : new Map();
  const indices = [...new Set([...map.keys(), ...moving.keys()])].filter((i) => set.role === 'motion' || i % FINE === 0).sort((a, b) => a - b);
  const baseDone = indices.filter((i) => i % FINE === 0).length;
  if (baseDone < BASE[set.variant]) incomplete = true;
  // A move whose base frames are being rendered again is not published half-done: its sets keep
  // what was published before, files included (RS_PUBLISH_PARTIAL=1 publishes it anyway).
  if (baseDone < BASE[set.variant] && !process.env.RS_PUBLISH_PARTIAL && previous.base === BASE_PATH) {
    if (previous.sets[set.name]) manifest.sets[set.name] = previous.sets[set.name];
    console.log(`${set.name}: kept as published, base frames ${baseDone}/${BASE[set.variant]} (move being rendered)`);
    continue;
  }

  const dir = join(out, set.name);
  await mkdir(dir, { recursive: true });
  let bytes = 0;
  let width = 0;
  let height = 0;
  const widths = [];
  for (const i of indices) {
    const source = moving.get(i) ?? map.get(i);
    const target = join(dir, `${pad(i)}.webp`);
    const key = `${set.name}/${pad(i)}`;
    // skip frames that are already converted from this very source and newer than it
    const fresh = existsSync(target) && (ledger[key] ?? source) === source && (await stat(target)).mtimeMs > (await stat(source)).mtimeMs;
    if (!fresh) {
      await sharp(source)
        .resize({ width: dwell.has(i) ? HOLD_WIDTH[set.variant] : set.width, withoutEnlargement: true })
        .webp({ quality: set.quality, effort: 5, smartSubsample: true })
        .toFile(target);
    }
    ledger[key] = source;
    const meta = await sharp(target).metadata();
    // the set's size is that of its ordinary frames; the dwell frames are larger
    if (!dwell.has(i) && meta.width > width) {
      width = meta.width;
      height = meta.height;
    }
    widths.push(meta.width);
    bytes += (await stat(target)).size;
  }
  // d-1920 only earns its place once frames wider than 1440 px exist
  if (set.name === 'd-1920' && width <= 1440) continue;
  manifest.sets[set.name] = { variant: set.variant, role: set.role, count, frames: runs(indices), width, height, bytes };
  const blurred = indices.filter((i) => blur.has(i) && !dwell.has(i) && set.role === 'motion').length;
  // motion frames narrower than the set: in-betweens whose large render does not exist yet
  const small = set.role === 'motion' ? widths.filter((w) => w < set.width).length : 0;
  if (small) incomplete = true;
  console.log(`${set.name}: ${indices.length} frames (${baseDone}/${BASE[set.variant]} base, ${indices.length - baseDone} in-between${blurred ? `, ${blurred} with motion blur` : ''}${dwell.size ? `, ${dwell.size} dwell frames` : ''}${small ? `, ${small} still small` : ''}), up to ${width}x${height}, ${(bytes / 1048576).toFixed(2)} MB`);
}

await mkdir(join(root, 'src', 'data'), { recursive: true });
await writeFile(manifestFile, JSON.stringify(manifest) + '\n');
await writeFile(ledgerFile, JSON.stringify(ledger));
console.log('manifest written');
if (incomplete) console.warn('WARNING: at least one camera move is not fully rendered yet — not a release state.');
