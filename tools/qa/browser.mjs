// Minimal Chrome DevTools Protocol driver for QA runs — no dependencies.
// Starts the locally installed Chrome (or Edge) headless and talks to it over a WebSocket.
// Used by the scripts in this folder for screenshots at exact viewports, reduced-motion and
// throttled runs, keyboard walks and Web Vitals measurements.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

/**
 * Page expression that scrolls the hero journey to a progress value. Progress is not linear in the
 * scroll position (slow stretches, `data-slow`); this is the same mapping as src/scripts/journey.ts.
 */
export const scrollToProgress = (p) => `(() => {
  const j = document.querySelector('[data-journey]');
  const slow = JSON.parse(j.dataset.slow || '[]');
  const N = 1024, E = 0.012, sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const warp = [0];
  let sum = 0;
  for (let i = 1; i <= N; i++) {
    const q = (i - 0.5) / N;
    let c = 1;
    for (const [a, b, f] of slow) c += (f - 1) * sm((q - a + E) / (2 * E)) * (1 - sm((q - b + E) / (2 * E)));
    sum += c;
    warp.push(sum);
  }
  const x = Math.min(1, Math.max(0, ${p})) * N, i = Math.min(N - 1, Math.floor(x));
  const s = (warp[i] + (warp[i + 1] - warp[i]) * (x - i)) / sum;
  scrollTo(0, j.getBoundingClientRect().top + scrollY + (j.offsetHeight - innerHeight) * s);
})()`;

export async function launch({ port = 9333 } = {}) {
  const binary = CANDIDATES.find((p) => existsSync(p));
  if (!binary) throw new Error('No Chrome/Edge found. Set CHROME_PATH.');
  const profile = await mkdtemp(join(tmpdir(), 'rs-qa-'));
  const child = spawn(
    binary,
    ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-extensions', '--force-color-profile=srgb', 'about:blank'],
    { stdio: 'ignore' },
  );

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (!target) {
    child.kill();
    throw new Error('Browser did not start');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      for (const fn of listeners.get(message.method) ?? []) fn(message.params);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const on = (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');

  const consoleMessages = [];
  on('Runtime.consoleAPICalled', (p) => consoleMessages.push({ type: p.type, text: p.args.map((a) => a.value ?? a.description ?? '').join(' ') }));
  on('Runtime.exceptionThrown', (p) => consoleMessages.push({ type: 'exception', text: p.exceptionDetails.exception?.description ?? p.exceptionDetails.text }));
  on('Log.entryAdded', (p) => consoleMessages.push({ type: p.entry.level, text: p.entry.text }));
  const requests = [];
  on('Network.responseReceived', (p) => requests.push({ url: p.response.url, status: p.response.status, type: p.type }));
  on('Network.loadingFailed', (p) => requests.push({ failed: true, reason: p.errorText, id: p.requestId }));

  const page = {
    send,
    on,
    wait,
    consoleMessages,
    requests,
    async viewport(width, height, { dpr = 1, mobile = false } = {}) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile });
      if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    },
    /** features: e.g. { 'prefers-reduced-motion': 'reduce' } */
    async media(features = {}) {
      await send('Emulation.setEmulatedMedia', { features: Object.entries(features).map(([name, value]) => ({ name, value })) });
    },
    async throttle({ cpu = 1, network = null } = {}) {
      await send('Emulation.setCPUThrottlingRate', { rate: cpu });
      if (network) await send('Network.emulateNetworkConditions', { offline: false, latency: network.latency, downloadThroughput: network.down, uploadThroughput: network.up });
    },
    async goto(url, { settle = 1200 } = {}) {
      const loaded = new Promise((resolve) => on('Page.loadEventFired', resolve));
      await send('Page.navigate', { url });
      await Promise.race([loaded, wait(20000)]);
      await wait(settle);
    },
    async eval(expression) {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    },
    async scrollTo(y, settle = 900) {
      await page.eval(`window.scrollTo(0, ${y})`);
      await wait(settle);
    },
    async key(key, { shift = false } = {}) {
      const map = { Tab: 9, Enter: 13, Escape: 27, ' ': 32, ArrowDown: 40, ArrowUp: 38 };
      const base = { key, code: key === ' ' ? 'Space' : key, windowsVirtualKeyCode: map[key] ?? 0, modifiers: shift ? 8 : 0 };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      await wait(60);
    },
    async type(text) {
      await send('Input.insertText', { text });
    },
    async screenshot(file, { fullPage = false } = {}) {
      await mkdir(dirname(file), { recursive: true });
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage });
      await writeFile(file, Buffer.from(data, 'base64'));
    },
    async close() {
      try {
        await send('Browser.close');
      } catch {
        /* already gone */
      }
      ws.close();
      child.kill();
      await wait(300);
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
  return page;
}
