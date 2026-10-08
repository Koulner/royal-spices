// Screenshots at exact viewports.
//   node tools/qa/shots.mjs <base-url> <out-dir> <spec> [<spec> ...]
// spec = name|WxH[@dpr][m]|path|action[,action...]
//   actions: p=0.4 (hero journey progress), y=1200 (scroll px), #id (scroll to element),
//            full (full-page capture), still (emulate prefers-reduced-motion), nojs (scripting off)
// Example: node tools/qa/shots.mjs http://127.0.0.1:4321 .raw/shots "hero-end|1440x900|/|p=1"
import { launch, scrollToProgress } from './browser.mjs';
import { join } from 'node:path';

const [base, out, ...specs] = process.argv.slice(2);
const page = await launch();
try {
  for (const spec of specs) {
    const [name, size, path, actionList = ''] = spec.split('|');
    const match = /^(\d+)x(\d+)(?:@([\d.]+))?(m?)$/.exec(size);
    const [width, height, dpr, mobile] = [Number(match[1]), Number(match[2]), Number(match[3] || 1), match[4] === 'm'];
    const actions = actionList.split(',').filter(Boolean);
    await page.viewport(width, height, { dpr, mobile });
    await page.media(actions.includes('still') ? { 'prefers-reduced-motion': 'reduce' } : {});
    await page.send('Emulation.setScriptExecutionDisabled', { value: actions.includes('nojs') });
    await page.goto(base + path, { settle: 1500 });
    let fullPage = false;
    for (const action of actions) {
      if (action.startsWith('p=')) {
        const p = Number(action.slice(2));
        // step towards the position so frames along the way get requested, like a person scrolling
        await page.eval(scrollToProgress(p));
        await page.wait(2600);
      } else if (action.startsWith('y=')) await page.scrollTo(Number(action.slice(2)));
      else if (action.startsWith('#')) {
        await page.eval(`document.getElementById(${JSON.stringify(action.slice(1))})?.scrollIntoView({ block: 'start' })`);
        await page.wait(900);
      } else if (action === 'full') fullPage = true;
    }
    const file = join(out, `${name}.png`);
    await page.screenshot(file, { fullPage });
    console.log('shot', file);
  }
  const problems = page.consoleMessages.filter((m) => ['error', 'exception', 'warning'].includes(m.type));
  if (problems.length) console.log('console:', JSON.stringify(problems.slice(0, 12), null, 1));
} finally {
  await page.close();
}
