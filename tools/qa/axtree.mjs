// What assistive technology is given: the browser's accessibility tree, in reading order.
//   node tools/qa/axtree.mjs <base-url>
// Checks on the home page (hero journey moving, hero static, compact menu closed and open):
// every control and picture has a name, the whole journey can be read in order whatever the scroll
// position, the canvas is not announced, a closed menu is out of reach and an open one closes off
// the page behind it. Writes the outlines to .raw/qa/axtree-*.txt.
// This is the tree Chrome exposes. It is not a run with VoiceOver, TalkBack, NVDA or JAWS.
import { launch, scrollToProgress } from './browser.mjs';
import { writeFile, mkdir } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://127.0.0.1:4321';
const SHOWN = new Set(['banner', 'navigation', 'main', 'contentinfo', 'region', 'heading', 'link', 'button', 'image', 'img', 'textbox', 'combobox', 'checkbox', 'list', 'figure']);
const NEEDS_NAME = new Set(['link', 'button', 'image', 'img', 'textbox', 'combobox', 'checkbox']);

let failed = 0;
const check = (ok, text) => {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const page = await launch();
await page.send('Accessibility.enable');

/** Flat reading order: { role, name, level, depth } for everything that is exposed. */
async function outline() {
  const { nodes } = await page.send('Accessibility.getFullAXTree');
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const root = nodes.find((n) => !n.parentId) ?? nodes[0];
  const out = [];
  const walk = (node, depth) => {
    const role = node.role?.value ?? '';
    const exposed = !node.ignored && role && role !== 'none' && role !== 'generic';
    if (exposed) {
      const level = node.properties?.find((p) => p.name === 'level')?.value?.value;
      out.push({ role, name: (node.name?.value ?? '').replace(/\s+/g, ' ').trim(), level, depth });
    }
    for (const id of node.childIds ?? []) if (byId.has(id)) walk(byId.get(id), depth + (exposed ? 1 : 0));
  };
  walk(root, 0);
  return out;
}

const text = (list) =>
  list
    .filter((n) => SHOWN.has(n.role))
    .map((n) => `${'  '.repeat(Math.min(n.depth, 8))}${n.role}${n.level ? ' ' + n.level : ''}${n.name ? ': ' + n.name : ''}`)
    .join('\n');
const names = (list, role) => list.filter((n) => n.role === role).map((n) => n.name);
// names are compared without case: CSS upper-casing reaches the accessible name
const position = (list, role, name, exact = false) => list.findIndex((n) => n.role === role && (exact ? n.name.toLowerCase() === name.toLowerCase() : n.name.toLowerCase().includes(name.toLowerCase())));

const JOURNEY = ['Safran aus Herat.', 'Crocus sativus', 'Die Narbe', 'Safran', 'Im Glas'];

try {
  await mkdir('.raw/qa', { recursive: true });

  // ---- hero journey moving, read from three scroll positions
  console.log('home, journey moving (1440 x 900)');
  await page.viewport(1440, 900);
  await page.goto(base + '/', { settle: 2500 });
  const snapshots = {};
  for (const p of [0, 0.5, 1]) {
    await page.eval(scrollToProgress(p));
    await page.wait(1500);
    snapshots[p] = await outline();
  }
  const top = snapshots[0];
  await writeFile('.raw/qa/axtree-home-motion.txt', text(top) + '\n');
  check(names(top, 'banner').length === 1 && names(top, 'main').length === 1 && names(top, 'contentinfo').length === 1, 'landmarks: one banner, one main, one contentinfo');
  check(names(top, 'navigation').every(Boolean), `navigation landmarks are named: ${names(top, 'navigation').join(', ')}`);
  const h1 = top.filter((n) => n.role === 'heading' && n.level === 1);
  check(h1.length === 1 && h1[0].name === 'Safran aus Herat.', `one h1: ${h1.map((n) => n.name).join(' | ')}`);
  const order = JOURNEY.map((name) => position(top, 'heading', name, true));
  check(order.every((i) => i >= 0) && order.every((i, k) => k === 0 || i > order[k - 1]), 'opening and all four chapters are exposed, in story order');
  const arrivalAt = position(top, 'heading', 'Ein Gramm im Glas');
  check(arrivalAt > order[4] && position(top, 'link', 'Produkt ansehen') > arrivalAt, 'the arrival and its actions follow the last chapter');
  check(position(top, 'button', 'Vom Crocus zum Glas') > order[0] && position(top, 'link', 'Reise überspringen') > 0, 'journey controls are exposed: continue, skip');
  check(!top.some((n) => n.role === 'canvas' || n.role === 'Canvas'), 'the canvas is not announced');
  const headingList = (list) => names(list, 'heading').join(' | ');
  check(headingList(snapshots[0.5]) === headingList(top) && headingList(snapshots[1]) === headingList(top), 'the same headings are exposed at the start, in the middle and at the end of the journey');
  const unnamed = top.filter((n) => NEEDS_NAME.has(n.role) && !n.name);
  check(unnamed.length === 0, `every link, button, picture and field has a name${unnamed.length ? ' — missing: ' + unnamed.map((n) => n.role).join(', ') : ''}`);
  const pictures = names(top, 'image').concat(names(top, 'img'));
  check(pictures.length > 0 && pictures.every((n) => n.length > 15), `${pictures.length} pictures with descriptive alternatives`);

  // ---- hero static (reduced motion)
  console.log('home, static hero (reduced motion)');
  await page.media({ 'prefers-reduced-motion': 'reduce' });
  await page.goto(base + '/', { settle: 2000 });
  const still = await outline();
  await writeFile('.raw/qa/axtree-home-static.txt', text(still) + '\n');
  const stillOrder = JOURNEY.map((name) => position(still, 'heading', name, true));
  check(stillOrder.every((i) => i >= 0) && stillOrder.every((i, k) => k === 0 || i > stillOrder[k - 1]), 'opening and all four chapters are exposed, in story order');
  check(position(still, 'button', 'Vom Crocus zum Glas') < 0 && position(still, 'link', 'Reise überspringen') < 0, 'no journey controls where there is no journey');
  check(position(still, 'heading', 'Ein Gramm im Glas') < 0, 'the arrival statement is not announced twice');
  check(position(still, 'link', 'Zum Produkt') > 0 && position(still, 'link', 'Für den Handel') > 0, 'both actions of the opening are exposed');
  await page.media({});

  // ---- compact menu
  console.log('compact menu (390 x 844)');
  await page.viewport(390, 844, { dpr: 2, mobile: true });
  await page.goto(base + '/', { settle: 2000 });
  const closed = await outline();
  check(position(closed, 'link', 'Herkunft & Qualität') < 0 || position(closed, 'link', 'Herkunft & Qualität') > position(closed, 'heading', 'Safran aus Herat.'), 'closed menu: its links are out of reach');
  check(position(closed, 'button', 'Menü') >= 0, 'closed menu: the toggle is exposed by name');
  await page.eval(`document.querySelector('[data-menu-toggle]').click()`);
  await page.wait(700);
  const open = await outline();
  await writeFile('.raw/qa/axtree-menu-open.txt', text(open) + '\n');
  check(['Produkte', 'Herkunft & Qualität', 'Handel', 'Gastronomie', 'Catering', 'Über uns', 'Kontakt'].every((name) => position(open, 'link', name) >= 0), 'open menu: all seven destinations are exposed');
  check(position(open, 'heading', 'Safran aus Herat.') < 0, 'open menu: the page behind it is closed off');
  check(position(open, 'button', 'Schließen') >= 0, 'open menu: the toggle says how to close it');
} finally {
  await page.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
