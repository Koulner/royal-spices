// How far the picture moves from one published hero frame to the next.
//   node tools/qa/frame-steps.mjs [set ...]        (default: the motion sets d-960 m-540)
// The page dissolves between neighbouring frames. That reads as movement only while the two
// pictures are close: if things have moved further than roughly half a percent of the picture
// width, a slow scroll shows them twice instead of moving.
// For every pair of neighbours this estimates the shift of the whole picture (the translation that
// matches them best, searched coarse to fine on small grey thumbnails) and what remains different
// after that shift (zoom, focus pulls, parallax). Shift is given in percent of the picture width.
// Used to decide where in-between frames are needed (pipeline/blender/queue-inbetweens.sh) and to
// record the result in docs/QA.md.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(join(root, 'src', 'data', 'hero-manifest.json'), 'utf8'));
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(manifest.sets).filter((n) => manifest.sets[n].role === 'motion');
const WIDTHS = [80, 160, 320];

const grey = async (file, width, height) => ({ width, height, data: await sharp(file).resize(width, height, { fit: 'fill' }).greyscale().raw().toBuffer() });

/** Mean absolute difference of b shifted by (dx, dy) against a, over the area both cover. */
function difference(a, b, dx, dy) {
  const x0 = Math.max(0, dx);
  const x1 = Math.min(a.width, a.width + dx);
  const y0 = Math.max(0, dy);
  const y1 = Math.min(a.height, a.height + dy);
  let sum = 0;
  for (let y = y0; y < y1; y++) {
    const rowA = y * a.width;
    const rowB = (y - dy) * b.width;
    for (let x = x0; x < x1; x++) sum += Math.abs(a.data[rowA + x] - b.data[rowB + x - dx]);
  }
  return sum / ((x1 - x0) * (y1 - y0));
}

/** Best translation between two frames, searched on a small pyramid. Returns shift in percent of the width. */
function shift(pyramidA, pyramidB) {
  let dx = 0;
  let dy = 0;
  let best = Infinity;
  for (let level = 0; level < pyramidA.length; level++) {
    const a = pyramidA[level];
    const b = pyramidB[level];
    const reach = level === 0 ? Math.round(a.width * 0.3) : 2;
    const cx = level === 0 ? 0 : dx * 2;
    const cy = level === 0 ? 0 : dy * 2;
    best = Infinity;
    for (let y = cy - reach; y <= cy + reach; y++) {
      for (let x = cx - reach; x <= cx + reach; x++) {
        const d = difference(a, b, x, y);
        if (d < best) {
          best = d;
          dx = x;
          dy = y;
        }
      }
    }
  }
  const width = pyramidA[pyramidA.length - 1].width;
  return { percent: (Math.hypot(dx, dy) / width) * 100, residual: best, plain: difference(pyramidA[pyramidA.length - 1], pyramidB[pyramidB.length - 1], 0, 0) };
}

for (const name of names) {
  const set = manifest.sets[name];
  if (!set) {
    console.log(`${name}: not in the manifest`);
    continue;
  }
  const indices = set.frames.flatMap(([first, last, stride]) => Array.from({ length: Math.floor((last - first) / stride) + 1 }, (_, k) => first + k * stride));
  const ratio = set.variant === 'desktop' ? 9 / 16 : 16 / 9;
  const steps = [];
  let previous = null;
  for (const index of indices) {
    const file = join(root, 'public', manifest.base, name, `${String(index).padStart(4, '0')}.webp`);
    const pyramid = await Promise.all(WIDTHS.map((w) => grey(file, w, Math.round(w * ratio))));
    if (previous) steps.push({ from: previous.index, to: index, ...shift(previous.pyramid, pyramid) });
    previous = { index, pyramid };
  }
  const sorted = (key) => steps.map((s) => s[key]).sort((a, b) => a - b);
  const pct = (list, p) => list[Math.min(list.length - 1, Math.floor(list.length * p))];
  const shifts = sorted('percent');
  const worst = steps.reduce((a, b) => (b.percent > a.percent ? b : a));
  console.log(`\n${name}: ${indices.length} frames on ${set.count} positions`);
  console.log(`  shift per step, % of width: median ${pct(shifts, 0.5).toFixed(2)}, 90th percentile ${pct(shifts, 0.9).toFixed(2)}, largest ${worst.percent.toFixed(2)} (positions ${worst.from}-${worst.to})`);
  console.log(`  steps shifting more than 1 %: ${steps.filter((s) => s.percent > 1).length}, more than 0.5 %: ${steps.filter((s) => s.percent > 0.5).length} of ${steps.length}`);
  console.log(`  difference left after the shift (0-255): median ${pct(sorted('residual'), 0.5).toFixed(1)}, largest ${pct(sorted('residual'), 1).toFixed(1)}; without compensation: median ${pct(sorted('plain'), 0.5).toFixed(1)}, largest ${pct(sorted('plain'), 1).toFixed(1)}`);
  // profile along the move, in tenths of the journey
  const last = set.count - 1;
  const bins = Array.from({ length: 10 }, () => []);
  for (const s of steps) bins[Math.min(9, Math.floor(((s.from + s.to) / 2 / last) * 10))].push(s.percent);
  console.log('  largest shift per tenth of the move: ' + bins.map((b) => (b.length ? Math.max(...b).toFixed(1) : '–')).join(' '));
  // RS_STEPS=1 lists every step: where exactly the picture travels fast
  if (process.env.RS_STEPS) console.log('  ' + steps.map((s) => `${s.from}:${s.percent.toFixed(1)}`).join(' '));
}
