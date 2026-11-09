// Loading order of the hero frames (T-20261022-52). Pure functions: journey.ts runs them, the tests run them in Node.
//
// The stretch the camera starts on loads first and in full density, so that the first swipe after the page
// opened warps instead of jumping between coarse frames. Then the whole move coarse-to-fine as before, so that
// every place is scrubbable soon, then the start in its finest frames, then the rest of the move.
//
//   start  the window from the camera up to just past the next stop ahead, coarse-to-fine down to stride 2:
//          after it, no two frames there are more than 2 positions apart (what the warp needs, MAX_SPAN)
//   move   both ends, then the whole move from stride 16 * fine down to the base grid (fine)
//   start  the window's remaining frames (stride 1)
//   move   the whole move from fine / 2 down to 1, and whatever is on none of these grids
//
// Each move stage completes a stride over the whole move: after the move stage of stride s, every frame on
// that grid is in. That is what the slow-link rule relies on (refineFits): it can stop at a complete level.

/** A finer level is only started when, at the pace the frames so far came in, it is complete within this many seconds. */
export const REFINE_SECONDS = 8;

/** Positions the window holds before the camera, for a page opened further down the move. */
export const WINDOW_BACK = 16;

export type Stage = { stride: number; frames: number[]; start: boolean };

/**
 * The positions that load first, [from, to]: from the camera up to just past the next stop ahead of it
 * (stops are progress values 0…1), so that the frame on or after the stop is part of it.
 */
export function startWindow(count: number, stops: number[], position: number, back = WINDOW_BACK): [number, number] {
  const last = count - 1;
  const p = Math.min(last, Math.max(0, position));
  const next = stops.map((s) => s * last).find((s) => s > p + 1) ?? last;
  return [Math.max(0, Math.floor(p) - back), Math.min(last, Math.ceil(next) + 1)];
}

/**
 * The loading stages for the frames `list` (the finest level the device uses) of a set of `count` positions on a
 * grid `fine` times as dense as the base frames. Every frame of `list` is in exactly one stage.
 */
export function loadPlan(list: number[], count: number, fine: number, window: [number, number]): Stage[] {
  const wanted = new Set(list);
  const stages: Stage[] = [];
  const [from, to] = window;
  const inside = (i: number) => i >= from && i <= to;
  const take = (stride: number, start: boolean, indices: Iterable<number>) => {
    const frames: number[] = [];
    for (const i of indices) if (wanted.delete(i)) frames.push(i);
    if (frames.length) stages.push({ stride, frames, start });
  };
  const grid = function* (stride: number, only?: (i: number) => boolean) {
    for (let i = 0; i < count; i += stride) if (!only || only(i)) yield i;
  };
  const top = 16 * fine;
  // start, coarse-to-fine down to stride 2
  for (let stride = fine; stride >= 2; stride = Math.floor(stride / 2)) take(stride, true, grid(stride, inside));
  // the whole move down to the base grid
  take(top, false, [0, count - 1, ...grid(top)]);
  for (let stride = top / 2; stride >= fine; stride = Math.floor(stride / 2)) take(stride, false, grid(stride));
  // the start's finest frames
  take(1, true, grid(1, inside));
  // the rest of the move
  for (let stride = Math.floor(fine / 2); stride >= 1; stride = Math.floor(stride / 2)) take(stride, false, grid(stride));
  if (wanted.size) stages.push({ stride: 1, frames: [...wanted].sort((a, b) => a - b), start: false });
  return stages;
}

/**
 * The start stages from `index` on are not worth loading ahead (refineFits): their frames go back into the
 * move stages of the same stride, so that those still complete their grid over the whole move.
 */
export function deferStart(stages: Stage[], index: number): Stage[] {
  const head = stages.slice(0, index);
  const moved = new Map<number, number[]>();
  const rest: Stage[] = [];
  for (const stage of stages.slice(index)) {
    if (stage.start) moved.set(stage.stride, [...(moved.get(stage.stride) ?? []), ...stage.frames]);
    else rest.push({ ...stage, frames: stage.frames.slice() });
  }
  for (const [stride, frames] of moved) {
    const same = rest.find((stage) => stage.stride === stride);
    if (same) same.frames = [...frames, ...same.frames];
    else {
      // no move stage of that stride: a new one, before the first finer one
      const at = rest.findIndex((stage) => stage.stride < stride);
      rest.splice(at < 0 ? rest.length : at, 0, { stride, frames, start: false });
    }
  }
  return [...head, ...rest];
}

/**
 * Whether `frames` more frames would be in within `limit` seconds, at the pace the `arrived` frames so far came in
 * over `elapsed` seconds (the frames are about equally large, so bytes and frames give the same estimate).
 */
export function refineFits(frames: number, arrived: number, elapsed: number, limit = REFINE_SECONDS): boolean {
  if (!arrived) return true;
  return (frames * Math.max(0.001, elapsed)) / arrived <= limit;
}

/** Frames of the move stages with that stride: what refining the whole move to it would still cost. */
export const moveFrames = (stages: Stage[], stride: number) => stages.reduce((n, stage) => n + (!stage.start && stage.stride === stride ? stage.frames.length : 0), 0);

// ---- video path (T-20261031-01): checks journey.ts runs before it fetches journey-video.ts

/**
 * Whether the device may take the video path at all, checked before the module is fetched: not with ?video=off or
 * ?webcodecs=0, not on the low tier, not without WebCodecs (`decoder`: VideoDecoder exists).
 */
export function videoWanted(search: string, tier: 'high' | 'medium' | 'low', decoder: boolean): boolean {
  const q = new URLSearchParams(search);
  return decoder && tier !== 'low' && q.get('video') !== 'off' && q.get('webcodecs') !== '0';
}

/**
 * Whether the video set of `variant` has frames for the window (progress [p0, p1]). Only then is the video built right
 * away; without any, its segments would only share the line with the WebP frames of the window.
 */
export function windowCovered(sets: Record<string, { variant: string; cover: [number, number][] }>, variant: string, window: [number, number]): boolean {
  const set = Object.values(sets).find((s) => s.variant === variant);
  return !!set && set.cover.some(([from, to]) => to >= window[0] && from <= window[1]);
}

/**
 * Whether the video set of `variant` covers the whole move in one range (src/data/hero-video.json, `cover` in
 * progress). Only then are no WebP motion frames loaded, just the sharp frames of the stops.
 */
export function wholeCover(sets: Record<string, { variant: string; cover: [number, number][] }>, variant: string, eps = 0.0005): boolean {
  const set = Object.values(sets).find((s) => s.variant === variant);
  return !!set && set.cover.some(([from, to]) => from <= eps && to >= 1 - eps);
}
