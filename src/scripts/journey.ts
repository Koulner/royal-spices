// Hero journey: scrubs a pre-rendered camera move with the page scroll.
//
// The page is complete without this file. It only runs when the inline head script has opted the
// document into motion (html.journey-on). Native scrolling stays untouched: no wheel handlers,
// no scroll locking. The scroll position is read, eased like a motion-control head, and drawn.

/**
 * `frames` lists the positions that exist as [first, last, stride] runs on a grid of `count` positions.
 * A motion set is dense: it is drawn while the camera moves. A rest set holds the base
 * frames in full resolution: one of them takes over once the camera has come to rest.
 */
type SetInfo = { variant: 'desktop' | 'mobile'; role: 'motion' | 'rest'; count: number; frames: [number, number, number][]; width: number; height: number; bytes: number };
type Tier = 'high' | 'medium' | 'low';

const root = document.querySelector<HTMLElement>('[data-journey]');
if (root && document.documentElement.classList.contains('journey-on')) start(root);

function start(root: HTMLElement) {
  const sets = JSON.parse(root.dataset.sets || '{}') as Record<string, SetInfo>;
  const stops = JSON.parse(root.dataset.stops || '[0,1]') as number[];
  const base = root.dataset.base || '/hero';
  // The camera move was rendered at base positions; in-between frames sit on a grid `fine` times as dense.
  const fine = Number(root.dataset.fine) || 1;
  const film = root.querySelector<HTMLElement>('[data-journey-canvas]')!;
  const sharp = root.querySelector<HTMLCanvasElement>('[data-journey-sharp]')!;
  const sharpCtx = sharp.getContext('2d', { alpha: false });
  const intro = root.querySelector<HTMLElement>('[data-journey-intro]')!;
  const arrival = root.querySelector<HTMLElement>('[data-journey-arrival]')!;
  const finalStill = root.querySelector<HTMLElement>('[data-journey-final]')!;
  const nextButton = root.querySelector<HTMLButtonElement>('[data-journey-next]')!;
  const nextLabel = root.querySelector<HTMLElement>('[data-journey-next-label]')!;
  const thread = root.querySelector<HTMLElement>('[data-journey-thread]')!;
  const media = root.querySelector<HTMLElement>('[data-journey-media]')!;
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-chapter]')].map((el) => ({
    el,
    from: Number(el.dataset.from),
    to: Number(el.dataset.to),
  }));
  const portrait = matchMedia('(max-aspect-ratio: 4/5)');

  // ---------------------------------------------------------------- device tier
  // Only the device decides what is drawn. The browser's network estimate is deliberately ignored:
  // it misreports under load (measured during development) and would hand a fast machine soft frames.
  // Slow links are covered by the loading order instead: coarse first, at low priority, refining over time.
  // People who ask for less data (Save-Data) get the static hero and never reach this file.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const tier: Tier = (() => {
    const memory = nav.deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    if (memory <= 2 || cores <= 2) return 'low';
    if (memory <= 4 || cores <= 4) return 'medium';
    return 'high';
  })();
  root.dataset.tier = tier;

  // ---------------------------------------------------------------- frame store
  let setName = '';
  let info: SetInfo | null = null;
  let generation = 0; // bumps when the set changes; stale loads are dropped
  let blobs: (Blob | undefined)[] = [];
  let failures = 0;
  let degraded = false;
  const bitmaps = new Map<number, ImageBitmap>();
  const decoding = new Set<number>();
  // decoded frames kept around the camera, as a memory budget in megabytes
  const cacheBudget = tier === 'high' ? 96 : tier === 'medium' ? 48 : 32;
  let cacheLimit = 24;

  // Levels of detail in time. Each stride keeps the positions on a coarser grid; levels[0] is every
  // frame this device uses. A slow or resting camera reads from levels[0]. A fast camera reads from
  // a coarser level, so the decoder is never asked for more frames than it can deliver.
  //   high    every frame, thinning step by step to the base frames at speed
  //   medium  one in-between per base step
  //   low     every third base frame
  const powers: number[] = [];
  for (let stride = 1; stride <= fine; stride *= 2) powers.push(stride);
  const strides = tier === 'high' ? powers : tier === 'medium' ? powers.slice(-2) : [fine * 3];
  let levels: number[][] = [[0]];
  let floors: Int16Array[] = [new Int16Array(1)];
  let level = 0;

  function buildLevels(set: SetInfo) {
    const present: number[] = [];
    for (const [first, last, stride] of set.frames) for (let i = first; i <= last; i += Math.max(1, stride)) present.push(i);
    const end = set.count - 1;
    levels = strides.map((stride) => present.filter((i) => i % stride === 0 || i === end));
    // floors[l][p]: index in levels[l] of the last frame at or before position p
    floors = levels.map((list) => {
      const table = new Int16Array(set.count);
      let k = 0;
      for (let p = 0; p < set.count; p++) {
        while (k + 1 < list.length && list[k + 1] <= p) k++;
        table[p] = k;
      }
      return table;
    });
    level = 0;
  }

  /** The two frames around a position in the given level. */
  function around(position: number, l: number) {
    const list = levels[l];
    const k = floors[l][Math.min(floors[l].length - 1, Math.max(0, Math.floor(position)))];
    return { list, k, a: list[k], b: list[Math.min(list.length - 1, k + 1)] };
  }

  /** Where the camera settles: on a frame the rest set can sharpen, else on the nearest frame there is. */
  function nearestFrame(position: number) {
    if (restList.length) {
      let best = restList[0];
      for (const p of restList) if (Math.abs(p - position) < Math.abs(best - position)) best = p;
      return best;
    }
    const { a, b } = around(position, 0);
    return position - a <= b - position ? a : b;
  }

  /**
   * Motion sets come in two sizes. The large one (d-1440m, m-720m) goes to capable devices whose
   * screen would stretch the small one by more than about 15 %: on a 2560 px laptop panel the
   * 960 px frames were stretched 2.7 times and looked soft and blocky while scrolling. Everything
   * else draws the small set (d-960, m-540), which decodes faster and loads in half the data.
   * Where the camera is fast, motion frames carry motion blur, so a rest set always takes over the
   * settled picture, on every device: sharp, and as large as the screen can show.
   */
  function chooseSets(): { motion: string | null; rest: string | null } {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const pixels = innerWidth * dpr;
    // device pixels across the frame as drawn: object-fit: cover fills the wider of the two fits
    const across = portrait.matches ? Math.max(innerWidth, (innerHeight * 9) / 16) * dpr : Math.max(innerWidth, (innerHeight * 16) / 9) * dpr;
    const large = tier === 'high' && across > (portrait.matches ? 620 : 1100);
    // A missing portrait set must not leave the stage empty: fall back to the landscape frames.
    const motion = portrait.matches ? [...(large ? ['m-720m'] : []), 'm-540', 'd-960'] : [...(large ? ['d-1440m'] : []), 'd-960', 'm-540'];
    const rest = portrait.matches ? ['m-720'] : pixels >= 1700 && tier === 'high' ? ['d-1920', 'd-1440'] : ['d-1440'];
    const name = motion.find((n) => sets[n]) ?? null;
    return { motion: name, rest: rest.find((n) => sets[n] && sets[n].variant === sets[name ?? '']?.variant) ?? null };
  }

  function url(set: string, index: number) {
    return `${base}/${set}/${String(index).padStart(4, '0')}.webp`;
  }

  // ---------------------------------------------------------------- rest layer
  // Once the camera has settled, the full-resolution frame of that position is laid over the
  // motion frame. It leaves the moment the camera moves again.
  let restName: string | null = null;
  let restList: number[] = [];
  let sharpWanted = -1;
  const sharpCache = new Map<number, ImageBitmap>();
  const sharpLoading = new Map<number, Promise<ImageBitmap | null>>();

  async function fetchSharp(set: string, index: number): Promise<ImageBitmap | null> {
    const mine = generation;
    try {
      const response = await fetch(url(set, index));
      if (!response.ok) return null;
      const bitmap = await createImageBitmap(await response.blob());
      if (mine !== generation) {
        bitmap.close();
        return null;
      }
      sharpCache.set(index, bitmap);
      // a handful is enough: the chapter stops and wherever the camera rested last
      for (const key of sharpCache.keys()) {
        if (sharpCache.size <= 10) break;
        if (key !== index && key !== sharpWanted) {
          sharpCache.get(key)?.close();
          sharpCache.delete(key);
        }
      }
      return bitmap;
    } catch {
      return null; // no sharp frame: the motion frame simply stays
    }
  }

  function loadSharp(index: number): Promise<ImageBitmap | null> {
    const cached = sharpCache.get(index);
    if (cached || !restName) return Promise.resolve(cached ?? null);
    let pending = sharpLoading.get(index);
    if (!pending) {
      pending = fetchSharp(restName, index).finally(() => sharpLoading.delete(index));
      sharpLoading.set(index, pending);
    }
    return pending;
  }

  function sharpen(index: number) {
    if (!restName || degraded || sharpWanted === index || !restList.includes(index)) return;
    sharpWanted = index;
    void loadSharp(index).then((bitmap) => {
      if (!bitmap || sharpWanted !== index) return;
      fill(sharp, sharpCtx, bitmap);
      sharp.classList.add('is-active');
    });
  }

  function soften() {
    if (sharpWanted < 0) return;
    sharpWanted = -1;
    sharp.classList.remove('is-active');
  }

  /** Coarse-to-fine order: the move is scrubbable after a handful of frames and sharpens as the rest arrive. */
  function loadOrder(list: number[], count: number) {
    const wanted = new Set(list);
    const order: number[] = [];
    const add = (i: number) => {
      if (wanted.delete(i)) order.push(i);
    };
    add(0);
    add(count - 1);
    for (let stride = 16 * fine; stride >= 1; stride = Math.floor(stride / 2)) {
      for (let i = 0; i < count; i += stride) add(i);
    }
    return order.concat([...wanted]);
  }

  async function loadSet() {
    const chosen = chooseSets();
    const name = chosen.motion;
    if (!name || (name === setName && chosen.rest === restName)) return;
    setName = name;
    restName = chosen.rest;
    root.dataset.set = name;
    root.dataset.rest = restName ?? '';
    info = sets[name];
    cacheLimit = Math.min(80, Math.max(12, Math.floor((cacheBudget * 1048576) / (info.width * info.height * 4))));
    const mine = ++generation;
    blobs = new Array(info.count);
    for (const bitmap of bitmaps.values()) bitmap.close();
    bitmaps.clear();
    decoding.clear();
    for (const bitmap of sharpCache.values()) bitmap.close();
    sharpCache.clear();
    sharpLoading.clear();
    soften();
    restList = [];
    if (restName) for (const [first, last, stride] of sets[restName].frames) for (let i = first; i <= last; i += Math.max(1, stride)) restList.push(i);
    buildLevels(info);
    forgetLayers();
    requestDraw();

    const queue = loadOrder(levels[0], info.count);
    const workers = Array.from({ length: tier === 'low' ? 3 : 6 }, async () => {
      while (queue.length && mine === generation && !degraded) {
        const index = queue.shift()!;
        try {
          const response = await fetch(url(name, index), { priority: 'low' } as RequestInit);
          if (!response.ok) throw new Error(String(response.status));
          const blob = await response.blob();
          if (mine !== generation) return;
          blobs[index] = blob;
          requestDraw();
        } catch {
          if (mine !== generation) return;
          if (++failures > 6) degrade();
        }
      }
    });
    await Promise.all(workers);
    // the places the "weiter" control stops at sharpen without a wait
    if (mine === generation && !degraded) for (const stop of stops) void loadSharp(nearestFrame(stop * (sets[name].count - 1)));
  }

  /** Frames cannot be shown (network, decode): keep the pinned story and dissolve between the two posters. */
  function degrade() {
    degraded = true;
    soften();
    film.classList.remove('is-live');
    root.dataset.tier = 'fallback';
    requestDraw();
  }

  function nearestLoaded(index: number) {
    if (!info) return -1;
    for (let d = 0; d < info.count; d++) {
      if (blobs[index - d]) return index - d;
      if (blobs[index + d]) return index + d;
    }
    return -1;
  }

  function decode(index: number) {
    const blob = blobs[index];
    if (!blob || bitmaps.has(index) || decoding.has(index) || decoding.size >= 3) return;
    const mine = generation;
    decoding.add(index);
    createImageBitmap(blob)
      .then((bitmap) => {
        decoding.delete(index);
        if (mine !== generation) return bitmap.close();
        bitmaps.set(index, bitmap);
        // Drop the frames farthest from where the camera is now. The budget is counted in pixels,
        // not frames: the frames of the stigma dwell are larger than the rest of the set.
        const room = cacheLimit * info!.width * info!.height;
        let held = 0;
        for (const kept of bitmaps.values()) held += kept.width * kept.height;
        if (held > room) {
          const centre = shown;
          const victims = [...bitmaps.keys()].sort((a, b) => Math.abs(b - centre) - Math.abs(a - centre));
          for (const key of victims) {
            if (held <= room || bitmaps.size <= 8) break;
            const victim = bitmaps.get(key)!;
            held -= victim.width * victim.height;
            victim.close();
            bitmaps.delete(key);
          }
        }
        requestDraw();
      })
      .catch(() => {
        decoding.delete(index);
        if (++failures > 6) degrade();
      });
  }

  // ---------------------------------------------------------------- picture
  // Two stacked canvases hold the two frames around the camera; the upper one's opacity is the
  // dissolve. Per screen refresh only that opacity changes, and a frame is copied into a canvas
  // once, when it first comes into play. Each canvas has the frame's own size; cropping to the
  // viewport and scaling are left to the browser (object-fit, with the same focal point as the
  // posters). That keeps the main thread free of pixel work on slow processors.
  type Layer = { el: HTMLCanvasElement; context: CanvasRenderingContext2D | null; index: number };
  const layers: Layer[] = [...film.querySelectorAll<HTMLCanvasElement>('[data-journey-layer]')].map((el) => ({ el, context: el.getContext('2d', { alpha: false }), index: -1 }));
  let dissolve = '';
  let hasFrame = false;

  /** Copies a frame into a canvas at its own size. */
  function fill(el: HTMLCanvasElement, context: CanvasRenderingContext2D | null, bitmap: ImageBitmap) {
    if (el.width !== bitmap.width || el.height !== bitmap.height) {
      el.width = bitmap.width;
      el.height = bitmap.height;
    }
    context?.drawImage(bitmap, 0, 0);
  }

  function hold(layer: Layer, index: number, bitmap: ImageBitmap) {
    if (layer.index === index) return;
    fill(layer.el, layer.context, bitmap);
    layer.index = index;
  }

  /** Shows frame a dissolved towards frame b by `mix`, reusing whatever the canvases already hold. */
  function present(a: number, frameA: ImageBitmap, b: number, frameB: ImageBitmap, mix: number) {
    const [lower, upper] = layers;
    // the canvas that holds neither frame takes the missing one; a frame already shown stays put
    const aIsUpper = upper.index === a || (lower.index === b && lower.index !== a);
    hold(aIsUpper ? upper : lower, a, frameA);
    if (b !== a) hold(aIsUpper ? lower : upper, b, frameB);
    const opacity = (b === a ? (aIsUpper ? 1 : 0) : aIsUpper ? 1 - mix : mix).toFixed(3);
    if (opacity !== dissolve) {
      dissolve = opacity;
      upper.el.style.opacity = opacity;
    }
    hasFrame = true;
  }

  function forgetLayers() {
    for (const layer of layers) layer.index = -1;
    dissolve = '';
  }

  function draw() {
    if (!info || degraded) return;
    const position = shown;
    const { list, k, a, b } = around(position, level);
    const mix = b === a ? 0 : Math.min(1, Math.max(0, (position - a) / (b - a)));

    // keep the frames ahead of the camera decoded, in the direction of travel
    const ahead = target >= current ? 1 : -1;
    for (const offset of [0, 1, 2, 3, 4, -1]) decode(list[Math.min(list.length - 1, Math.max(0, k + offset * ahead))]);
    decode(b);

    const frameA = bitmaps.get(a);
    const frameB = bitmaps.get(b);
    if (frameA && frameB) {
      // neighbouring frames are cross-dissolved: between pictures this close it reads as movement
      present(a, frameA, b, frameB, mix);
      return;
    }
    // exact frames not ready: show the nearest decoded one rather than nothing
    const near = nearestLoaded(Math.round(position));
    if (near < 0) return;
    if (!bitmaps.has(near)) decode(near);
    let closest = -1;
    for (const key of bitmaps.keys()) if (closest < 0 || Math.abs(key - position) < Math.abs(closest - position)) closest = key;
    const fallback = bitmaps.get(closest);
    if (fallback) present(closest, fallback, closest, fallback, 0);
  }

  // ---------------------------------------------------------------- progress
  let target = 0;
  let current = 0;
  let raf = 0;
  let lastTime = 0;
  // Frame position actually drawn. While the page scrolls it follows the camera and neighbouring
  // frames are cross-dissolved; once scrolling rests it settles onto one whole frame, so a resting
  // picture is never a double exposure.
  let shown = 0;
  let lastInput = 0;
  // positions travelled per drawn frame, smoothed: picks the level of detail in time
  let pace = 0;
  // camera speed in progress per second, and how stiffly it follows the scroll position (1/s)
  let velocity = 0;
  const FOLLOW = 10;

  function span() {
    return Math.max(1, root.offsetHeight - innerHeight);
  }

  function readScroll() {
    target = Math.min(1, Math.max(0, -root.getBoundingClientRect().top / span()));
  }

  function requestDraw() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame(time: number) {
    raf = 0;
    const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 0.016;
    lastTime = time;
    // The camera follows the scroll position like a critically damped spring (exact step, stable at
    // any frame time). Unlike a simple lag its speed never jumps: it eases out of rest and into it,
    // and the single notches of a mouse wheel melt into one glide. No overshoot.
    const offset = current - target;
    const decay = Math.exp(-FOLLOW * dt);
    const pull = velocity + FOLLOW * offset;
    current = target + (offset + pull * dt) * decay;
    velocity = (velocity - pull * FOLLOW * dt) * decay;
    if (Math.abs(current - target) < 0.00004 && Math.abs(velocity) < 0.0004) {
      current = target;
      velocity = 0;
    }
    const last = (info?.count ?? 1) - 1;
    const resting = current === target && time - lastInput > 180;
    const goal = resting ? nearestFrame(current * last) : current * last;
    const before = shown;
    shown = Math.abs(goal - shown) < 0.003 ? goal : shown + (goal - shown) * (resting ? 1 - Math.exp(-dt / 0.11) : 1);
    pace += (Math.abs(shown - before) - pace) * 0.35;
    level = 0;
    if (!resting) while (level < strides.length - 1 && pace > strides[level]) level++;
    updateInterface();
    draw();
    // settled between the two ends (which have their own full-resolution stills): sharpen
    if (resting && shown === goal && current >= 0.004 && current <= 0.992) sharpen(goal);
    else soften();
    if (current !== target || decoding.size || shown !== goal || !resting) requestDraw();
    else lastTime = 0;
  }

  // What changes every frame is written on the one element that uses it. A custom property on the
  // section itself would restyle the whole hero on every frame, and that is what a slow processor
  // cannot afford: the frame rate halved under four-fold throttling.
  let exitShown = '';
  let labelShown = '';

  function updateInterface() {
    thread.style.setProperty('--journey-p', current.toFixed(4));
    const exit = Math.min(1, Math.max(0, (current - 0.94) / 0.06)).toFixed(3);
    if (exit !== exitShown) {
      exitShown = exit;
      media.style.setProperty('--journey-exit', exit);
    }
    intro.classList.toggle('is-active', current < 0.065);
    arrival.classList.toggle('is-active', current > 0.925);
    for (const chapter of chapters) chapter.el.classList.toggle('is-active', current >= chapter.from && current <= chapter.to);
    // at both ends the full-resolution stills take over from the frame sequence
    const atStart = current < 0.004;
    const atEnd = degraded ? current > 0.62 : current > 0.992 && target > 0.992;
    film.classList.toggle('is-live', !degraded && hasFrame && !atStart);
    finalStill.classList.toggle('is-active', atEnd);
    const label = target < 0.02 ? 'Vom Crocus zum Glas' : target > 0.97 ? 'Weiter zur Herkunft' : 'Weiter';
    if (label !== labelShown) {
      labelShown = label;
      nextLabel.textContent = label;
    }
  }

  function scrollToProgress(p: number, smooth = true) {
    const top = root.getBoundingClientRect().top + scrollY + p * span();
    scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }

  // ---------------------------------------------------------------- wiring
  addEventListener(
    'scroll',
    () => {
      lastInput = performance.now();
      readScroll();
      requestDraw();
    },
    { passive: true },
  );

  let resizeTimer = 0;
  addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        readScroll();
        void loadSet();
      }, 120);
    },
    { passive: true },
  );
  portrait.addEventListener('change', () => void loadSet());

  nextButton.addEventListener('click', () => {
    const next = stops.find((stop) => stop > target + 0.02);
    if (next === undefined) document.getElementById('herkunft')?.scrollIntoView({ behavior: 'smooth' });
    else scrollToProgress(next);
  });

  // Keyboard: a focused control must be on screen. The opening lives at the start, the product at the end.
  // The jump is immediate (no eased camera travel), so focus never rests on something still out of sight.
  function jumpTo(p: number) {
    scrollToProgress(p, false);
    readScroll();
    current = target;
    velocity = 0;
    requestDraw();
  }
  intro.addEventListener('focusin', () => {
    if (target > 0.06) jumpTo(0);
  });
  arrival.addEventListener('focusin', () => {
    if (target < 0.93) jumpTo(1);
  });

  readScroll();
  current = target;
  root.classList.add('is-ready');
  lastInput = performance.now();
  updateInterface();
  void loadSet();
}
