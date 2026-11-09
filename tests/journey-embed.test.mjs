// T-20261031-01 A2a: the start page's video path. The check before the module is fetched (videoWanted), whether a
// set leaves out the WebP motion frames (wholeCover, src/scripts/journey-load.ts), and the video's crop like the
// layers' object-fit: cover at the focal point (cropOf, src/scripts/journey-video.ts). Runtime in the browser: A2b.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { videoWanted, wholeCover } from '../src/scripts/journey-load.ts';
import { cropOf } from '../src/scripts/journey-video.ts';

// frozen manifest of set c (tests/fixtures/hero-video/, D3): the wholeCover check does not depend on the shipped video set
const video = JSON.parse(readFileSync(new URL('./fixtures/hero-video/hero-video-c.json', import.meta.url), 'utf8'));
const near = (actual, expected, eps = 1e-12) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) <= eps, `[${i}] ${v} != ${expected[i]}`));
};
// resize() in journey-video.ts before A2a: always centred
const centred = (cw, ch, W, H) => {
  const ca = cw / ch, va = W / H;
  return ca > va ? [0, (1 - va / ca) / 2, 1, va / ca] : [(1 - ca / va) / 2, 0, ca / va, 1];
};

test('videoWanted: yes on the high and medium tier with a decoder', () => {
  assert.equal(videoWanted('', 'high', true), true);
  assert.equal(videoWanted('?vmode=blend', 'medium', true), true);
  assert.equal(videoWanted('?video=on&webcodecs=1', 'high', true), true);
});

test('videoWanted: not with ?video=off', () => {
  assert.equal(videoWanted('?video=off', 'high', true), false);
  assert.equal(videoWanted('?vstats=1&video=off', 'medium', true), false);
});

test('videoWanted: not with ?webcodecs=0', () => {
  assert.equal(videoWanted('?webcodecs=0', 'high', true), false);
});

test('videoWanted: not on the low tier', () => {
  assert.equal(videoWanted('', 'low', true), false);
});

test('videoWanted: not without a decoder (no VideoDecoder)', () => {
  assert.equal(videoWanted('', 'high', false), false);
  assert.equal(videoWanted('', 'medium', false), false);
});

test('wholeCover: c1920 and c1080h cover only parts of the move', () => {
  assert.equal(video.sets.c1920.variant, 'desktop');
  assert.equal(video.sets.c1080h.variant, 'mobile');
  assert.equal(wholeCover(video.sets, 'desktop'), false);
  assert.equal(wholeCover(video.sets, 'mobile'), false);
  assert.equal(wholeCover({ c1920: video.sets.c1920 }, 'desktop'), false);
});

test('wholeCover: one range [0, 1] covers the whole move, within eps', () => {
  assert.equal(wholeCover({ s: { variant: 'desktop', cover: [[0, 1]] } }, 'desktop'), true);
  assert.equal(wholeCover({ s: { variant: 'mobile', cover: [[0.2, 0.3], [0.0004, 0.9996]] } }, 'mobile'), true);
  assert.equal(wholeCover({ s: { variant: 'desktop', cover: [[0.001, 1]] } }, 'desktop'), false);
  assert.equal(wholeCover({ s: { variant: 'desktop', cover: [[0, 0.999]] } }, 'desktop'), false);
  // the ranges are counted one by one (coverFromPos already joins touching runs)
  assert.equal(wholeCover({ s: { variant: 'desktop', cover: [[0, 0.5], [0.5, 1]] } }, 'desktop'), false);
});

test('wholeCover: another variant, or no set at all', () => {
  assert.equal(wholeCover({ s: { variant: 'desktop', cover: [[0, 1]] } }, 'mobile'), false);
  assert.equal(wholeCover({ s: { variant: 'mobile', cover: [[0, 1]] } }, 'desktop'), false);
  assert.equal(wholeCover({}, 'desktop'), false);
});

test('cropOf: wide and tall canvas with f = 0.5 as before', () => {
  // 1920 x 1080 video in a 2560 x 1080 canvas: full width, the middle three quarters of the height
  assert.deepEqual(cropOf(2560, 1080, 1920, 1080), [0, 0.125, 1, 0.75]);
  // in a 1080 x 1920 canvas: full height, 81/256 of the width in the middle
  near(cropOf(1080, 1920, 1920, 1080), [(1 - 81 / 256) / 2, 0, 81 / 256, 1]);
  for (const [cw, ch, W, H] of [
    [2560, 1080, 1920, 1080],
    [1080, 1920, 1920, 1080],
    [1366, 768, 1920, 1080],
    [390, 844, 1080, 1920],
    [1440, 900, 1080, 1920],
    [801, 1000, 1080, 1920],
  ]) {
    assert.deepEqual(cropOf(cw, ch, W, H), centred(cw, ch, W, H), `${cw}x${ch} / ${W}x${H}`);
    assert.deepEqual(cropOf(cw, ch, W, H, 0.5, 0.5), centred(cw, ch, W, H));
  }
});

test('cropOf: the focal point moves the crop like object-position (74 % / 50 %, tall 50 % / 20 %)', () => {
  // wider canvas: a quarter of the height is cut off, fy = 0.2 puts a fifth of that above the crop
  near(cropOf(2560, 1080, 1920, 1080, 0.74, 0.2), [0, 0.05, 1, 0.75]);
  near(cropOf(2560, 1080, 1920, 1080, 0.74, 0.5), [0, 0.125, 1, 0.75]);
  // taller canvas: 1 - 81/256 of the width is cut off, fx = 0.74 puts 74 % of that left of the crop
  near(cropOf(1080, 1920, 1920, 1080, 0.74, 0.5), [(1 - 81 / 256) * 0.74, 0, 81 / 256, 1]);
  near(cropOf(1080, 1920, 1920, 1080, 0.84, 0.5), [(1 - 81 / 256) * 0.84, 0, 81 / 256, 1]);
  // CSS: the point at f of the picture sits at f of the box; f = 0 and 1 are the edges
  for (const f of [0, 0.2, 0.5, 0.74, 0.84, 1]) {
    const [u0, , du] = cropOf(1080, 1920, 1920, 1080, f, 0.5);
    near([u0 + f * du], [f]);
    const [, v0, , dv] = cropOf(2560, 1080, 1920, 1080, 0.5, f);
    near([v0 + f * dv], [f]);
  }
  near(cropOf(1080, 1920, 1920, 1080, 1, 0.5), [1 - 81 / 256, 0, 81 / 256, 1]);
});

test('cropOf: the same aspect ratio shows the whole picture, whatever the focal point', () => {
  assert.deepEqual(cropOf(1920, 1080, 1920, 1080), [0, 0, 1, 1]);
  assert.deepEqual(cropOf(960, 540, 1920, 1080, 0.74, 0.2), [0, 0, 1, 1]);
  assert.deepEqual(cropOf(540, 960, 1080, 1920, 0.5, 0.2), [0, 0, 1, 1]);
});
