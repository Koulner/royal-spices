// T-20261022-52: loading order of the hero frames (src/scripts/journey-load.ts). The start of the move first,
// in the density the warp needs; every frame exactly once; each move stage completes its grid; the slow-link
// rule still stops at a complete level. Measured in the browser by tools/qa/start-check.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../src/scripts/journey-load.ts';
import { MAX_SPAN, stridesFor } from '../src/scripts/journey-flow.ts';

const manifest = JSON.parse(readFileSync(new URL('../src/data/hero-manifest.json', import.meta.url), 'utf8'));
const fine = manifest.fine;
const stops = [0, 0.22, 0.4, 0.56, 0.76, 1]; // src/data/journey.ts
const range = (from, to, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const listFor = (count, tier) => {
  const finest = stridesFor(tier, fine)[0];
  return range(0, count - 1).filter((i) => i % finest === 0 || i === count - 1);
};
const sets = Object.entries(manifest.sets).filter(([, s]) => s.role === 'motion');

test('the start window reaches just past the next stop ahead of the camera', () => {
  assert.deepEqual(L.startWindow(713, stops, 0), [0, 158]); // stop 0.22 * 712 = 156.6
  assert.deepEqual(L.startWindow(505, stops, 0), [0, 112]); // 0.22 * 504 = 110.9
  // further down: from WINDOW_BACK behind the camera to the next stop; on a stop, to the one after it
  assert.deepEqual(L.startWindow(713, stops, 200), [184, 286]); // 0.4 * 712 = 284.8
  assert.deepEqual(L.startWindow(713, stops, 0.4 * 712), [268, 400]); // 0.56 * 712 = 398.7
  assert.deepEqual(L.startWindow(713, stops, 700), [684, 712]);
  assert.deepEqual(L.startWindow(713, stops, 712), [696, 712]);
});

for (const [name, set] of sets) {
  for (const tier of ['high', 'medium', 'low']) {
    test(`${name} ${tier}: every frame once, the start first, each move stage completes its grid`, () => {
      const list = listFor(set.count, tier);
      const window = L.startWindow(set.count, stops, 0);
      const stages = L.loadPlan(list, set.count, fine, window);
      const all = stages.flatMap((s) => s.frames);
      assert.equal(all.length, list.length);
      assert.deepEqual([...new Set(all)].sort((a, b) => a - b), list);
      // the start comes first, down to stride 2, before anything outside the window
      const firstMove = stages.findIndex((s) => !s.start);
      const head = stages.slice(0, firstMove).flatMap((s) => s.frames);
      assert.ok(head.every((i) => i >= window[0] && i <= window[1]));
      const inWindow = list.filter((i) => i >= window[0] && i <= window[1]);
      for (const i of inWindow) if (i % 2 === 0) assert.ok(head.includes(i), `${i} in the start`);
      // after the head, no two frames of the list in the window are more than MAX_SPAN apart (where the list allows it)
      const have = new Set(head);
      const chain = inWindow.filter((i) => have.has(i));
      for (let k = 1; k < chain.length; k++) {
        const gap = chain[k] - chain[k - 1];
        const listGap = inWindow[inWindow.indexOf(chain[k])] - inWindow[inWindow.indexOf(chain[k]) - 1];
        assert.ok(gap <= Math.max(MAX_SPAN, listGap), `gap ${chain[k - 1]}…${chain[k]}`);
      }
      // move stages: after the move stage of stride s, every frame of the list on that grid is in
      const loaded = new Set();
      for (const stage of stages) {
        for (const i of stage.frames) loaded.add(i);
        if (stage.start) continue;
        for (const i of list) if (i % stage.stride === 0) assert.ok(loaded.has(i), `${i} after move stride ${stage.stride}`);
      }
    });
  }
}

test('deferStart: the start frames go into the move stages of the same stride, nothing lost', () => {
  const list = range(0, 712);
  const stages = L.loadPlan(list, 713, fine, L.startWindow(713, stops, 0));
  const at = stages.findIndex((s) => s.start && s.stride === 4);
  const deferred = L.deferStart(stages, at);
  assert.deepEqual(deferred.slice(0, at), stages.slice(0, at));
  assert.ok(deferred.slice(at).every((s) => !s.start));
  const sorted = (xs) => xs.slice().sort((a, b) => a - b);
  assert.deepEqual(sorted(deferred.flatMap((s) => s.frames)), list);
  // the move stage of stride 4 again holds the whole grid of 4 that the start had not loaded
  const loaded = new Set(deferred.slice(0, at).flatMap((s) => s.frames));
  for (const stage of deferred.slice(at)) {
    for (const i of stage.frames) loaded.add(i);
    for (const i of list) if (i % stage.stride === 0) assert.ok(loaded.has(i), `${i} after stride ${stage.stride}`);
  }
  // the original plan is untouched
  assert.ok(stages[at].start);
});

test('deferStart adds a move stage where none of that stride exists', () => {
  const stages = [
    { stride: 8, frames: [0, 8], start: true },
    { stride: 2, frames: [2, 6], start: true },
    { stride: 8, frames: [16, 24], start: false },
    { stride: 1, frames: [1, 3], start: false },
  ];
  assert.deepEqual(L.deferStart(stages, 1), [stages[0], { stride: 8, frames: [16, 24], start: false }, { stride: 2, frames: [2, 6], start: false }, { stride: 1, frames: [1, 3], start: false }]);
});

test('refineFits: frames × seconds per frame so far against REFINE_SECONDS', () => {
  assert.equal(L.REFINE_SECONDS, 8);
  assert.ok(L.refineFits(100, 0, 5)); // nothing measured yet
  assert.ok(L.refineFits(80, 40, 4)); // 0.1 s per frame: 8 s
  assert.ok(!L.refineFits(81, 40, 4));
  assert.equal(L.moveFrames([{ stride: 4, frames: [4, 12], start: false }, { stride: 4, frames: [20], start: true }, { stride: 2, frames: [2], start: false }], 4), 2);
});

test('slow link: the plan run with refineFits stops at a complete level and loads no frame finer than it', () => {
  // simulated: 1.6 Mbit/s, d-1440m (~33.6 kB per frame) -> 0.17 s per frame
  const list = range(0, 712);
  let stages = L.loadPlan(list, 713, fine, L.startWindow(713, stops, 0));
  const perFrame = 0.17;
  let arrived = 0;
  let finest = 1;
  const loaded = [];
  for (let s = 0; s < stages.length; s++) {
    const stage = stages[s];
    if (stage.stride < fine && arrived) {
      const elapsed = arrived * perFrame;
      if (stage.start && !L.refineFits(L.moveFrames(stages, stage.stride), arrived, elapsed)) {
        stages = L.deferStart(stages, s--);
        continue;
      }
      if (!stage.start && !L.refineFits(stage.frames.length, arrived, elapsed)) {
        finest = stage.stride * 2;
        break;
      }
    }
    loaded.push(...stage.frames);
    arrived += stage.frames.length;
  }
  assert.equal(finest, fine);
  assert.deepEqual(loaded.slice().sort((a, b) => a - b), list.filter((i) => i % fine === 0 || i === 712));
});

test('windowCovered: only a set with frames in the window counts', () => {
  const sets = { a: { variant: 'desktop', cover: [[0.427, 0.472], [0.735, 0.785]] }, b: { variant: 'mobile', cover: [[0, 1]] } };
  assert.equal(L.windowCovered(sets, 'desktop', [0, 0.22]), false);
  assert.equal(L.windowCovered(sets, 'desktop', [0.42, 0.5]), true);
  assert.equal(L.windowCovered(sets, 'desktop', [0.5, 0.7]), false);
  assert.equal(L.windowCovered(sets, 'mobile', [0, 0.22]), true);
  assert.equal(L.windowCovered(sets, 'other', [0, 1]), false);
});
