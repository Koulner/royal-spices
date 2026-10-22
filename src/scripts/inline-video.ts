// Inline video (src/components/InlineVideo.astro): picks one encoding from the manifest
// (src/data/videos.json), loads it and the poster only near the viewport (before the first scroll
// only when in view) and plays it once, muted, from half visibility on. Pauses out of view or in a
// hidden tab, never resumes after a pause by the user,
// stays on the last frame at the end. prefers-reduced-motion: no autoplay, the source comes on click.
// chooseSource is pure and tested under Node (tests/inline-video.test.mjs); the DOM part runs only
// in the browser.

export type Source = { src: string; type: string; codec: string; width: number; height: number; bytes: number };
export type Env = { av1Efficient: boolean; cssWidth: number; dpr: number; saveData?: boolean; effectiveType?: string };

const SLOW = ['slow-2g', '2g', '3g'];

/** The smallest encoding that covers the rendered width (with 10 % slack), else the largest.
 *  AV1 only when the device decodes it power-efficiently; on Save-Data or a slow link the smallest. */
export function chooseSource(sources: Source[], env: Env): Source | undefined {
  const av1 = sources.filter((s) => s.codec === 'av1');
  const h264 = sources.filter((s) => s.codec === 'h264');
  const pool = (env.av1Efficient && av1.length ? av1 : h264.length ? h264 : sources).slice().sort((a, b) => a.width - b.width);
  if (!pool.length) return undefined;
  if (env.saveData || SLOW.includes(env.effectiveType ?? '')) return pool[0];
  const need = env.cssWidth * env.dpr * 0.9;
  return pool.find((s) => s.width >= need) ?? pool[pool.length - 1];
}

/** MediaCapabilities wants the video codec alone: 'codecs="av01…, mp4a.40.2"' -> 'codecs="av01…"'. */
export const videoContentType = (type: string) => type.replace(/codecs="([^",]+)[^"]*"/, 'codecs="$1"');

async function av1Efficient(sources: Source[], duration: number, fps: number) {
  const s = sources.find((x) => x.codec === 'av1');
  const mc = navigator.mediaCapabilities;
  if (!s || !mc?.decodingInfo) return false;
  try {
    const r = await mc.decodingInfo({
      type: 'file',
      video: { contentType: videoContentType(s.type), width: s.width, height: s.height, bitrate: Math.round((s.bytes * 8) / duration), framerate: fps },
    });
    return r.supported && r.powerEfficient;
  } catch {
    return false;
  }
}

function setup(fig: HTMLElement) {
  const video = fig.querySelector('video');
  const bar = fig.querySelector<HTMLElement>('.ivideo__bar');
  const btn = (act: string) => fig.querySelector<HTMLButtonElement>(`[data-act="${act}"]`)!;
  if (!video || !bar) return;
  const [playBtn, soundBtn, againBtn] = [btn('play'), btn('sound'), btn('again')];
  const sources: Source[] = [...video.querySelectorAll('source')].map((el) => ({
    src: el.getAttribute('src') ?? '',
    type: el.type,
    codec: el.dataset.codec ?? '',
    width: Number(el.dataset.width),
    height: Number(el.dataset.height),
    bytes: Number(el.dataset.bytes),
  }));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let choice: boolean | null = null; // the user's last play/pause; null = autoplay rule
  let ended = false;
  let inView = false;
  let half = false;
  let near = false; // within one viewport height of the frame
  let scrolled = false; // before the first scroll only what is in view loads
  let loading: Promise<void> | undefined;
  const poster = fig.querySelector('template'); // inert until it is placed (no-JS: <noscript>)
  let starting = false;

  const wanted = () => !ended && (choice ?? !reduce.matches);
  const render = () => {
    const playing = !video.paused && !ended;
    playBtn.hidden = ended;
    againBtn.hidden = !ended;
    playBtn.toggleAttribute('data-on', playing);
    playBtn.setAttribute('aria-label', playing ? 'Anhalten' : 'Abspielen');
    soundBtn.toggleAttribute('data-on', !video.muted);
    soundBtn.querySelector('span')!.textContent = video.muted ? 'Ton an' : 'Ton aus';
  };
  const source = () =>
    (loading ??= av1Efficient(sources, Number(fig.dataset.duration), Number(fig.dataset.fps)).then((av1) => {
      const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      const s = chooseSource(sources, { av1Efficient: av1, cssWidth: fig.clientWidth, dpr: devicePixelRatio || 1, saveData: c?.saveData, effectiveType: c?.effectiveType });
      if (!s) return;
      video.src = s.src; // before preload: the other way round the browser starts the native <source> pick first
      video.preload = 'metadata';
    }));
  const start = async () => {
    if (starting) return;
    starting = true;
    try {
      await source();
      if (wanted() && inView && !document.hidden) await video.play();
    } catch (e) {
      if ((e as Error).name === 'NotAllowedError' && choice === null) choice = false; // autoplay refused: the play button stays
    } finally {
      starting = false;
      render();
    }
  };
  const prepare = () => {
    if (!inView && !(near && scrolled)) return;
    poster?.replaceWith(poster.content); // a no-op once it is placed
    if (!reduce.matches) void source();
  };
  const update = () => {
    if (!inView || document.hidden || !wanted()) {
      if (!video.paused) video.pause();
    } else if (video.paused && half) void start();
  };

  video.controls = false;
  fig.dataset.js = '';
  bar.hidden = false;
  render();

  playBtn.addEventListener('click', () => {
    choice = video.paused;
    if (choice) {
      inView = true;
      void start();
    } else video.pause();
  });
  againBtn.addEventListener('click', () => {
    ended = false;
    choice = true;
    video.currentTime = 0;
    void start();
    render(); // shows the play button again before it takes the focus
    playBtn.focus();
  });
  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
  });
  video.addEventListener('loadeddata', () => fig.toggleAttribute('data-ready', true));
  video.addEventListener('ended', () => {
    const focused = document.activeElement === playBtn; // render() hides the button, which drops its focus
    ended = true;
    render();
    if (focused) againBtn.focus();
  });
  for (const t of ['play', 'pause', 'volumechange']) video.addEventListener(t, render);
  document.addEventListener('visibilitychange', update);
  reduce.addEventListener('change', update);

  new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      half = e.intersectionRatio >= 0.5;
      prepare();
      update();
    },
    { threshold: [0, 0.5] },
  ).observe(fig);
  new IntersectionObserver(
    ([e]) => {
      near = e.isIntersecting;
      prepare();
    },
    { rootMargin: '100% 0px' },
  ).observe(fig);
  addEventListener(
    'scroll',
    () => {
      scrolled = true;
      prepare();
    },
    { once: true, passive: true },
  );
}

if (typeof document !== 'undefined') {
  document.querySelectorAll<HTMLElement>('[data-ivideo]').forEach((fig) => {
    if ('IntersectionObserver' in window) return setup(fig);
    const poster = fig.querySelector('template'); // without observers: the poster at once, native controls
    poster?.replaceWith(poster.content);
  });
}
