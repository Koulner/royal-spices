// Favicon set (pipeline/images/build-favicons.mjs): the four PNGs in public/ have exactly their sizes,
// the apple-touch-icon is opaque, and Base.astro links every one of them (rule S8, tools/seo/checks.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const publicDir = new URL('../public/', import.meta.url);
const ICONS = [
  { file: 'favicon-48.png', size: 48 },
  { file: 'favicon-96.png', size: 96 },
  { file: 'favicon-192.png', size: 192 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const metadata = async (file) => sharp(await readFile(new URL(file, publicDir))).metadata();

for (const { file, size } of ICONS) {
  test(`${file} is a PNG of exactly ${size}×${size}`, async () => {
    const meta = await metadata(file);
    assert.equal(meta.format, 'png');
    assert.equal(meta.width, size);
    assert.equal(meta.height, size);
  });
}

test('apple-touch-icon.png has no alpha channel', async () => {
  const meta = await metadata('apple-touch-icon.png');
  assert.equal(meta.hasAlpha, false);
  assert.equal(meta.channels, 3);
});

test('Base.astro links each PNG with its sizes and the apple-touch-icon', async () => {
  const base = await readFile(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
  const links = base.match(/<link\b[^>]*>/g) ?? [];
  const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const byHref = (href) => links.find((tag) => attr(tag, 'href') === href);

  for (const { file, size } of ICONS.filter((icon) => icon.file.startsWith('favicon-'))) {
    const link = byHref(`/${file}`);
    assert.ok(link, `no <link> for /${file}`);
    assert.equal(attr(link, 'rel'), 'icon');
    assert.equal(attr(link, 'type'), 'image/png');
    assert.equal(attr(link, 'sizes'), `${size}x${size}`);
  }

  const touch = byHref('/apple-touch-icon.png');
  assert.ok(touch, 'no <link> for /apple-touch-icon.png');
  assert.equal(attr(touch, 'rel'), 'apple-touch-icon');
  assert.equal(attr(touch, 'sizes'), '180x180');
  assert.ok(byHref('/favicon.svg'), 'the SVG favicon stays linked');
});
