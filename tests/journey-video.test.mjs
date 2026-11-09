// T-20261031-01: hero video path (src/scripts/journey-video.ts) and its data (tools/hero-video/split.mjs,
// public/hero/v/, src/data/hero-video.json). Pure logic only: set choice, covered ranges, frame lookup by progress,
// loading order, index check, and the split round trip (segments put back together = the encoder's .bin).
// Decoding and drawing need a browser and are measured there.
// Two kinds of tests (D3): logic tests read frozen data from tests/fixtures/hero-video/ (manifest and index files of
// set c, JSON only) and keep their exact expectations. Data tests loop over the sets of the shipped manifest and
// name no set, so swapping the hero video (public/hero/v/ and src/data/hero-video.json) needs no change here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as V from '../src/scripts/journey-video.ts';
import { BASE_FRAMES, MAX_BYTES, coverFromPos as splitCover, plan } from '../tools/hero-video/split.mjs';

const root = new URL('../', import.meta.url);
const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
// shipped data: whichever sets src/data/hero-video.json lists
const manifest = readJson(new URL('src/data/hero-video.json', root));
const dirOf = (name) => new URL(`public/hero/v/${name}/`, root);
const rawIndex = (name) => readJson(new URL('index.json', dirOf(name)));
const index = (name) => V.parseIndex(rawIndex(name));
const segFiles = (name, idx) => idx.segments.map((s) => readFileSync(new URL(s.file, dirOf(name))));
// frozen data for the logic tests: set c (b1/hero-video-c.json and its two index.json), no video files
const FIX = new URL('tests/fixtures/hero-video/', root);
const fixManifest = readJson(new URL('hero-video-c.json', FIX));
const fixRaw = (name) => readJson(new URL(`${name}.index.json`, FIX));
const fixIndex = (name) => V.parseIndex(fixRaw(name));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const maxGap = (idx) => (idx.grid - 1) / (BASE_FRAMES[idx.variant] - 1);
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
const SPLIT = fileURLToPath(new URL('tools/hero-video/split.mjs', root));
// MD5 of the encoder output the segments were cut from. Checked only for a set listed here; a set without an entry
// still gets the key frame, size and round trip checks.
const SOURCE = {
  c1920: '65e89b43ed6c337cf9fb100673cbd7da', // T-20261023-04 sets on F:
  c1080h: '01b2f240ee522414af1451517ed2a852',
  e1920: '8d9a2b4196b8de880d9816f6fb73c770', // T-20261031-01 replacement set, F:\royal-spices-staging\T-20261031-01\sets\
  e1080h: 'b256520b6269a23f9f105704be7aa14a',
};
// AVCC access unit: well-formed length-prefixed NAL units, one of them an IDR slice (type 5)
const idrUnit = (b, size, lenSize) => {
  let o = 0, idr = false;
  while (o + lenSize <= size) {
    let len = 0;
    for (let k = 0; k < lenSize; k++) len = len * 256 + b[o + k];
    o += lenSize;
    if (len < 1 || o + len > size) return false;
    if ((b[o] & 31) === 5) idr = true;
    o += len;
  }
  return o === size && idr;
};

test('pickSet takes the set of the wanted variant and rejects an unknown manifest', () => {
  const d = V.pickSet(fixManifest, 'desktop');
  const m = V.pickSet(fixManifest, 'mobile');
  assert.equal(d?.name, 'c1920');
  assert.equal(d.index, 'c1920/index.json');
  assert.equal(d.frames, 898);
  assert.equal(m?.name, 'c1080h');
  assert.equal(m.width, 1080);
  assert.equal(V.pickSet({ ...fixManifest, format: 'rs-video-manifest-0' }, 'desktop'), null);
  assert.equal(V.pickSet({ format: 'rs-video-manifest-1', base: '/hero/v', sets: { c1920: fixManifest.sets.c1920 } }, 'mobile'), null);
  assert.equal(V.pickSet(null, 'desktop'), null);
});

for (const name of Object.keys(fixManifest.sets)) {
  test(`fixture ${name}: cover is two ranges, the same as coverFromPos on the index`, () => {
    const set = V.pickSet(fixManifest, fixManifest.sets[name].variant);
    const idx = fixIndex(name);
    assert.equal(maxGap(idx), 512); // (grid - 1) / (base frames - 1): one of today's motion frames
    const expected = [[0.427, 0.472], [0.735, 0.785]];
    assert.equal(set.cover.length, 2);
    set.cover.forEach((r, k) => r.forEach((x, j) => near(x, expected[k][j], 0.003, `cover[${k}][${j}]`)));
    assert.deepEqual(V.coverFromPos(idx.pos, idx.grid, maxGap(idx)), set.cover);
    assert.deepEqual(splitCover(Array.from(idx.pos), idx.grid, maxGap(idx)), set.cover);
  });
}

for (const [name, s] of Object.entries(manifest.sets)) {
  test(`${name}: cover is coverFromPos on the index`, () => {
    const idx = index(name);
    assert.ok(Array.isArray(s.cover) && s.cover.length >= 1, 'at least one covered range');
    assert.deepEqual(V.coverFromPos(idx.pos, idx.grid, maxGap(idx)), s.cover);
    assert.deepEqual(splitCover(Array.from(idx.pos), idx.grid, maxGap(idx)), s.cover);
  });
}

test('coverFromPos joins gaps up to maxGap and splits above it', () => {
  const pos = [0, 10, 20, 31, 100, 105];
  const want = [[0, 0.1], [0.155, 0.155], [0.5, 0.525]];
  assert.deepEqual(V.coverFromPos(pos, 201, 10), want);
  assert.deepEqual(splitCover(pos, 201, 10), want);
  assert.deepEqual(V.coverFromPos(pos, 201, 69), [[0, 0.525]]);
  assert.deepEqual(V.coverFromPos([7], 11, 1), [[0.7, 0.7]]);
});

test('covers: inside and on the edges of a range, not in the gap or outside', () => {
  const set = V.pickSet(fixManifest, 'desktop');
  const [[a0, a1], [b0, b1]] = set.cover;
  for (const p of [a0, a1, (a0 + a1) / 2, b0, b1, 0.76]) assert.equal(V.covers(set, p), true, `p ${p}`);
  for (const p of [0, 0.1, a0 - 0.001, (a1 + b0) / 2, b1 + 0.001, 1]) assert.equal(V.covers(set, p), false, `p ${p}`);
});

// frames at grid 10, 20, 40, 80 on a grid of 101 positions (p = i / 100): uneven spacing
const POS = [10, 20, 40, 80];

test('locate: ends and exact hits give a single frame in both modes', () => {
  for (const mode of ['nearest', 'blend']) {
    assert.deepEqual(V.locate(POS, 101, 0, mode), { a: 0, b: 0, t: 0 });
    assert.deepEqual(V.locate(POS, 101, 0.1, mode), { a: 0, b: 0, t: 0 });
    assert.deepEqual(V.locate(POS, 101, 1, mode), { a: 3, b: 3, t: 0 });
    assert.deepEqual(V.locate(POS, 101, 0.2, mode), { a: 1, b: 1, t: 0 });
    assert.deepEqual(V.locate([5], 11, 0.9, mode), { a: 0, b: 0, t: 0 });
  }
});

test('locate nearest: the frame closer in progress, not in index', () => {
  assert.deepEqual(V.locate(POS, 101, 0.29, 'nearest'), { a: 1, b: 1, t: 0 }); // 9 from 20, 11 from 40
  assert.deepEqual(V.locate(POS, 101, 0.31, 'nearest'), { a: 2, b: 2, t: 0 });
  assert.deepEqual(V.locate(POS, 101, 0.59, 'nearest'), { a: 2, b: 2, t: 0 }); // 19 from 40, 21 from 80
  assert.deepEqual(V.locate(POS, 101, 0.61, 'nearest'), { a: 3, b: 3, t: 0 });
});

test('locate blend: neighbours mixed by their distance in progress, snapped close to a frame', () => {
  const r = V.locate(POS, 101, 0.25, 'blend');
  assert.deepEqual([r.a, r.b], [1, 2]);
  near(r.t, 0.25, 1e-9, 't between 20 and 40');
  const s = V.locate(POS, 101, 0.7, 'blend');
  assert.deepEqual([s.a, s.b], [2, 3]);
  near(s.t, 0.75, 1e-9, 't between 40 and 80');
  assert.deepEqual(V.locate(POS, 101, 0.2005, 'blend'), { a: 1, b: 1, t: 0 });
  assert.deepEqual(V.locate(POS, 101, 0.799, 'blend'), { a: 3, b: 3, t: 0 });
});

test('locate on c1920: every frame position finds its own frame', () => {
  const idx = fixIndex('c1920');
  const g = idx.grid - 1;
  for (let k = 0; k < idx.frames; k++) {
    assert.equal(V.locate(idx.pos, idx.grid, idx.pos[k] / g, 'nearest').a, k);
    if (k < idx.frames - 1) {
      const r = V.locate(idx.pos, idx.grid, (idx.pos[k] + idx.pos[k + 1]) / 2 / g, 'blend');
      assert.deepEqual([r.a, r.b], [k, k + 1]);
      near(r.t, 0.5, 1e-6, `t at frame ${k}`);
    }
  }
});

test('inWindow: a segment counts when its progress range touches the window', () => {
  const pos = [0, 10, 20, 30, 40, 50];
  const seg = { first: 2, count: 2 }; // progress 0.2 to 0.3 on a grid of 101
  assert.equal(V.inWindow(seg, pos, 101, [0, 0.19]), false);
  assert.equal(V.inWindow(seg, pos, 101, [0, 0.2]), true);
  assert.equal(V.inWindow(seg, pos, 101, [0.25, 0.26]), true);
  assert.equal(V.inWindow(seg, pos, 101, [0.3, 1]), true);
  assert.equal(V.inWindow(seg, pos, 101, [0.31, 1]), false);
  assert.equal(V.inWindow(seg, pos, 101, [0.4, 0.1]), true);
});

test('segmentOrder: the start window first, then the rest by distance from `from`', () => {
  const pos = Array.from({ length: 100 }, (_, k) => k); // grid 100: p = k / 99
  const segs = Array.from({ length: 10 }, (_, k) => ({ first: k * 10, count: 10 }));
  assert.deepEqual(V.segmentOrder(segs, pos, 100, [0.45, 0.62], 0.45), [4, 5, 6, 3, 2, 7, 1, 8, 0, 9]);
  assert.deepEqual(V.segmentOrder(segs, pos, 100, [0, 0.05], 0), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(V.segmentOrder(segs, pos, 100, [1, 1], 1), [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
});

for (const name of Object.keys(manifest.sets)) {
  test(`${name}: segmentOrder lists every segment once, the window's segments before all others`, () => {
    const idx = index(name);
    const g = idx.grid - 1;
    const touches = (s, [w0, w1]) => idx.pos[s.first + s.count - 1] / g >= w0 && idx.pos[s.first] / g <= w1;
    for (const [window, from] of [[[0.427, 0.45], 0.427], [[0.74, 0.76], 0.74], [[0, 0.1], 0], [[0.5, 0.6], 0.55], [[0.78, 1], 0.9]]) {
      const order = V.segmentOrder(idx.segments, idx.pos, idx.grid, window, from);
      assert.deepEqual([...order].sort((a, b) => a - b), idx.segments.map((_, k) => k));
      const flags = order.map((k) => touches(idx.segments[k], window));
      const firstOther = flags.indexOf(false);
      assert.ok(firstOther === -1 || flags.slice(firstOther).every((f) => !f), `window ${window}`);
    }
  });
}

test('parseIndex decodes the position deltas and checks segments against the frame sizes', () => {
  const raw = fixRaw('c1920');
  assert.equal(raw.format, 'rs-video-2');
  assert.equal(raw.posDelta, true);
  const idx = V.parseIndex(raw);
  assert.equal(idx.frames, 898);
  assert.equal(idx.pos[0], 155661);
  assert.equal(idx.pos[idx.frames - 1], 286167);
  assert.equal(idx.bytes, 3671634);
  assert.equal(idx.keys[0], 0);
  assert.ok(Array.from(idx.keys).every((k) => k % idx.gop === 0));
  // the same list written out absolute parses to the same positions
  const abs = V.parseIndex({ ...raw, posDelta: false, pos: Array.from(idx.pos) });
  assert.deepEqual(Array.from(abs.pos), Array.from(idx.pos));
});

test('parseIndex rejects a wrong format and inconsistent indexes', () => {
  const raw = fixRaw('c1080h');
  const bad = [
    null,
    { ...raw, format: 'rs-video-1' },
    { ...raw, variant: 'tablet' },
    { ...raw, segments: raw.segments.slice(1) },
    { ...raw, segments: raw.segments.slice(0, -1) },
    { ...raw, segments: [{ ...raw.segments[0], bytes: raw.segments[0].bytes + 1 }, ...raw.segments.slice(1)] },
    { ...raw, segments: [{ ...raw.segments[0], file: '../x.bin' }, ...raw.segments.slice(1)] },
    { ...raw, keys: raw.keys.slice(1) },
    { ...raw, pos: [raw.pos[0], 0, ...raw.pos.slice(2)] },
    { ...raw, frames: raw.frames + 1 },
  ];
  for (const b of bad) assert.throws(() => V.parseIndex(b), /hero video index/);
  // a segment that starts inside a GOP
  const cut = raw.segments[0].count - 1;
  const moved = [{ ...raw.segments[0], count: cut, bytes: raw.sizes.slice(0, cut).reduce((a, b) => a + b, 0) }, { ...raw.segments[1], first: cut, count: raw.segments[1].count + 1, bytes: raw.segments[1].bytes + raw.sizes[cut] }, ...raw.segments.slice(2)];
  assert.throws(() => V.parseIndex({ ...raw, segments: moved }), /key frame/);
});

for (const [name, s] of Object.entries(manifest.sets)) {
  test(`${name}: each segment starts with a key frame and stays within 1 MiB, together they are the encoder's .bin (MD5 if on record)`, (t) => {
    const idx = index(name);
    const files = segFiles(name, idx);
    if (SOURCE[name]) assert.equal(md5(Buffer.concat(files)), SOURCE[name]);
    else t.diagnostic(`${name}: no encoder MD5 in SOURCE, key frames, sizes and round trip only`);
    const lenSize = (Buffer.from(idx.description, 'base64')[4] & 3) + 1;
    const keys = new Set(idx.keys);
    idx.segments.forEach((seg, k) => {
      assert.equal(files[k].length, seg.bytes, seg.file);
      assert.ok(keys.has(seg.first), `${seg.file} starts at key frame`);
      assert.ok(idrUnit(files[k], idx.sizes[seg.first], lenSize), `${seg.file} begins with an IDR access unit`);
      const oneGop = idx.keys.filter((x) => x >= seg.first && x < seg.first + seg.count).length === 1;
      assert.ok(seg.bytes <= MAX_BYTES || oneGop, `${seg.file}: ${seg.bytes} bytes`);
    });
  });

  test(`${name}: split.mjs round trip reproduces segments, index and manifest entry`, () => {
    const idx = index(name);
    const raw = rawIndex(name);
    const dir = mkdtempSync(join(tmpdir(), 'rs-split-'));
    try {
      let o = 0;
      const frames = Array.from(idx.sizes, (n, k) => ({ o: (o += n) - n, n, key: idx.keys.includes(k) }));
      const meta = { format: 'rs-video-1', set: name, codec: raw.codec, displayWidth: raw.width, displayHeight: raw.height, description: raw.description, colorSpace: raw.colorSpace, gop: raw.gop, frames };
      writeFileSync(join(dir, 'in.bin'), Buffer.concat(segFiles(name, idx)));
      writeFileSync(join(dir, 'in.json'), JSON.stringify(meta));
      writeFileSync(join(dir, 'in.pos.json'), JSON.stringify({ format: 'rs-pos-1', grid: idx.grid, i: Array.from(idx.pos) }));
      const out = join(dir, 'out');
      const args = [SPLIT, join(dir, 'in.bin'), join(dir, 'in.json'), join(dir, 'in.pos.json'), out, '--variant', s.variant];
      const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      assert.deepEqual(JSON.parse(stdout), { [name]: s });
      assert.equal(readFileSync(join(out, 'index.json'), 'utf8'), readFileSync(new URL('index.json', dirOf(name)), 'utf8'));
      for (const seg of idx.segments) assert.ok(readFileSync(join(out, seg.file)).equals(readFileSync(new URL(seg.file, dirOf(name)))), seg.file);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('split plan: whole GOPs packed up to the limit, an oversized GOP alone', () => {
  const f = (n, key = false) => ({ n, key });
  assert.deepEqual(plan([f(500, true), f(100), f(100), f(2000, true), f(300, true), f(50)], 1000), [
    { first: 0, count: 3, bytes: 700 },
    { first: 3, count: 1, bytes: 2000 },
    { first: 4, count: 2, bytes: 350 },
  ]);
  assert.deepEqual(plan([f(300, true), f(300, true), f(300, true)], 700), [{ first: 0, count: 2, bytes: 600 }, { first: 2, count: 1, bytes: 300 }]);
  assert.throws(() => plan([f(10), f(10, true)], 100), /key frame/);
});

test('split.mjs without --variant prints the usage and exits 2', () => {
  assert.throws(() => execFileSync(process.execPath, [SPLIT, 'a.bin', 'a.json', 'a.pos.json', 'out'], { stdio: 'ignore' }), (e) => e.status === 2);
});

test('videoUsable: switched off by URL, without WebCodecs, or when the codec is unsupported', async () => {
  assert.equal(await V.videoUsable('?video=off'), false);
  assert.equal(await V.videoUsable('?webcodecs=0'), false);
  assert.equal(await V.videoUsable(''), false); // Node has no VideoDecoder
  const g = globalThis;
  let supported = true, seen = null;
  g.EncodedVideoChunk = class {};
  g.VideoDecoder = class {
    static async isConfigSupported(c) {
      seen = c;
      if (supported === 'throw') throw new TypeError('bad codec');
      return { supported, config: c };
    }
  };
  try {
    assert.equal(await V.videoUsable('', 'avc1.640032'), true);
    assert.equal(seen.codec, 'avc1.640032');
    assert.equal(await V.videoUsable('?hw=0'), true);
    assert.equal(seen.hardwareAcceleration, 'prefer-software');
    assert.equal(await V.videoUsable('?video=off'), false);
    supported = false;
    assert.equal(await V.videoUsable(''), false);
    supported = 'throw';
    assert.equal(await V.videoUsable(''), false);
  } finally {
    delete g.VideoDecoder;
    delete g.EncodedVideoChunk;
  }
});

test('manifest entries match their index files, and there is a set for each variant', () => {
  assert.equal(manifest.format, 'rs-video-manifest-1');
  assert.equal(manifest.base, '/hero/v');
  for (const v of ['desktop', 'mobile']) assert.ok(V.pickSet(manifest, v), `a ${v} set`);
  for (const [name, s] of Object.entries(manifest.sets)) {
    const idx = index(name);
    assert.equal(s.index, `${name}/index.json`);
    assert.equal(idx.set, name);
    assert.equal(idx.variant, s.variant);
    assert.deepEqual([idx.frames, idx.width, idx.height, idx.bytes], [s.frames, s.width, s.height, s.bytes]);
  }
});
