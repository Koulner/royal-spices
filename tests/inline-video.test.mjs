// T-20261021-33: the inline video (src/components/InlineVideo.astro). The pure source choice of
// src/scripts/inline-video.ts, and the manifest src/data/videos.json against the files in public/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { chooseSource, videoContentType } from '../src/scripts/inline-video.ts';

const root = new URL('../', import.meta.url);
const videos = JSON.parse(readFileSync(new URL('src/data/videos.json', root), 'utf8'));
const stills = JSON.parse(readFileSync(new URL('src/data/stills.json', root), 'utf8'));
const bar = videos.bar.sources;
const pick = (env) => {
  const s = chooseSource(bar, { av1Efficient: false, cssWidth: 420, dpr: 1, ...env });
  return `${s.codec}-${s.width}`;
};

test('chooseSource: AV1 only when power-efficient, otherwise H.264', () => {
  assert.equal(pick({ av1Efficient: true }), 'av1-720');
  assert.equal(pick({ av1Efficient: false }), 'h264-720');
  // no AV1 in the list: H.264 even when AV1 would be efficient
  assert.equal(chooseSource(bar.filter((s) => s.codec === 'h264'), { av1Efficient: true, cssWidth: 420, dpr: 1 }).codec, 'h264');
});

test('chooseSource: smallest encoding with width >= cssWidth * dpr * 0.9, else the largest', () => {
  assert.equal(pick({ cssWidth: 335, dpr: 2 }), 'h264-720'); // 603 px needed
  assert.equal(pick({ cssWidth: 800, dpr: 1 }), 'h264-720'); // 720 >= 720 (0.9 slack)
  assert.equal(pick({ cssWidth: 801, dpr: 1 }), 'h264-1080');
  assert.equal(pick({ cssWidth: 420, dpr: 2, av1Efficient: true }), 'av1-1080'); // 756 px needed
  assert.equal(pick({ cssWidth: 420, dpr: 4 }), 'h264-1080'); // nothing covers 1512 px: the largest
});

test('chooseSource: Save-Data or a slow link always gets the smallest', () => {
  assert.equal(pick({ cssWidth: 420, dpr: 3, saveData: true }), 'h264-720');
  for (const effectiveType of ['slow-2g', '2g', '3g']) assert.equal(pick({ cssWidth: 420, dpr: 3, effectiveType }), 'h264-720');
  assert.equal(pick({ cssWidth: 420, dpr: 3, effectiveType: '4g' }), 'h264-1080');
  assert.equal(chooseSource([], { av1Efficient: false, cssWidth: 420, dpr: 1 }), undefined);
});

test('videoContentType keeps only the video codec', () => {
  assert.equal(videoContentType('video/mp4; codecs="av01.0.08M.08, mp4a.40.2"'), 'video/mp4; codecs="av01.0.08M.08"');
  assert.equal(videoContentType('video/mp4; codecs="avc1.640028"'), 'video/mp4; codecs="avc1.640028"');
});

test('manifest: every source exists under public/ with the stated size and codecs', () => {
  for (const [name, film] of Object.entries(videos)) {
    assert.ok(film.sources.length > 0, `${name}: no sources`);
    assert.ok(film.width > 0 && film.height > 0 && film.duration > 0 && film.fps > 0, `${name}: size, duration, fps`);
    for (const s of film.sources) {
      const file = new URL(`public${s.src}`, root);
      assert.ok(existsSync(file), `${name}: missing ${s.src}`);
      assert.equal(statSync(file).size, s.bytes, `${name}: bytes of ${s.src}`);
      assert.match(s.type, /codecs=/, `${name}: type of ${s.src}`);
      assert.ok(['av1', 'h264'].includes(s.codec), `${name}: codec of ${s.src}`);
      assert.equal(s.width / s.height, film.width / film.height, `${name}: aspect of ${s.src}`);
    }
  }
});

test('manifest: the poster is a still', () => {
  for (const [name, film] of Object.entries(videos)) {
    const still = stills[film.poster];
    assert.ok(still, `${name}: poster "${film.poster}" not in stills.json`);
    assert.equal(still.width / still.height, film.width / film.height, `${name}: poster aspect`);
  }
});
