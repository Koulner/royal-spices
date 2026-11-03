// Redesign „Der rote Faden“ (T-20261103-02): was der Aufguss und der Faden an Regeln einhalten müssen,
// ohne Browser. Die Messungen im Browser macht tools/qa/redesign.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const script = read('src/scripts/infusion.ts');
const stage = read('src/components/home/Infusion.astro');
const thread = read('src/components/RedThread.astro');
const css = read('src/styles/global.css');

const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i] * lin(c), 0);
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const token = (name) => new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(css)[1];

test('the script only reads the scroll position', () => {
  for (const banned of ['scrollTo', 'scrollBy', 'scrollIntoView', 'preventDefault', 'wheel', 'touchmove']) {
    assert.ok(!script.includes(banned), banned);
  }
  assert.match(script, /'scroll',[\s\S]*?\{ passive: true \}/);
});

test('the frame callback writes variables and never measures', () => {
  const draw = /const draw = \(\) => \{([\s\S]*?)\n  \};/.exec(script)[1];
  assert.ok(!/getBoundingClientRect|offsetHeight|innerHeight/.test(draw));
  assert.ok(/setProperty\('--p'/.test(draw));
});

test('without motion the script leaves the dyed end state alone', () => {
  assert.match(script, /if \(moving\) \{/);
  assert.match(script, /let gold = !moving;/);
});

test('the base state of the stage is the dyed end, the stage itself needs js and motion', () => {
  const styles = stage.slice(stage.indexOf('<style>'));
  const gate = styles.indexOf('@media screen and (prefers-reduced-motion: no-preference)');
  assert.ok(gate > 0);
  const base = styles.slice(0, gate);
  assert.ok(!/sticky|460vh|var\(--p\)/.test(base));
  assert.match(base, /linear-gradient\(to bottom, var\(--gold-hell\), var\(--gold\)\)/);
  assert.match(styles.slice(gate), /:global\(html\.js\) \.aufguss/);
});

test('no markup style attributes and no parameter that switches the motion', () => {
  for (const source of [stage, thread, read('src/components/home/HomeCollection.astro'), read('src/pages/index.astro')]) {
    assert.ok(!/<[a-z][^>]*\sstyle=/i.test(source));
    assert.ok(!source.includes('bewegung'));
  }
  assert.ok(!script.includes('location'));
});

test('the moved colours keep AA on their surfaces', () => {
  for (const [fg, bg, need] of [
    ['kerze', 'nacht', 4.5],
    ['kerze-2', 'nacht', 4.5],
    ['blatt', 'nacht', 4.5],
    ['kerze', 'tisch', 4.5],
    ['kerze-2', 'tisch', 4.5],
    ['blatt', 'tisch', 4.5],
    ['ink', 'gold', 4.5],
    ['ink', 'gold-hell', 4.5],
    ['saffron-deep', 'gold', 3],
  ]) {
    assert.ok(ratio(token(fg), token(bg)) >= need, `${fg} on ${bg}: ${ratio(token(fg), token(bg)).toFixed(2)}`);
  }
});

test('the hero classes stay as they were: the redesign only appends to global.css', () => {
  const start = css.indexOf('Der rote Faden (Redesign');
  assert.ok(start > 0);
  const added = css.slice(start);
  for (const hero of ['.btn {', '.link {', '.eyebrow {', '.lead {', '.wrap {', 'body {', '.display-xl']) {
    assert.ok(!added.includes(`\n${hero}`), hero);
  }
});

test('masks are generated, small and in the cached image folder', () => {
  for (const file of ['dye-fine.avif', 'dye-soft.avif', 'dye-fine.webp', 'dye-soft.webp', 'threads.svg']) {
    const path = join(ROOT, 'public/img/infusion', file);
    assert.ok(existsSync(path), file);
    assert.ok(statSync(path).size < 240_000, file);
  }
  const generator = read('tools/redesign/gen-dye.mjs');
  assert.ok(!/[A-Z]:[\\/]/.test(generator.replace(/^\/\/.*$/gm, '')), 'no absolute path in the generator');
  assert.match(stage, /loading="lazy"/);
});
