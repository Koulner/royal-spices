#!/usr/bin/env bash
# The odd positions of the grid: twice as many pictures in the motion sets.
#
# Why: the motion sets used every second position of the grid of 8 per base step (landscape 378
# frames, portrait 253 once its blurred frames exist). Scrolled through in nine seconds that is about
# 42 and 28 different pictures per second; the dissolve in between still reads as steps on a 144 Hz
# screen. Decision of the client on 2026-10-07 (option A): fill every position of the grid,
# landscape 713, portrait 505. Nothing that exists is rendered again.
#
# Same size, samples and motion blur as queue-large.sh, same folders, so pipeline/images/build-hero.mjs
# picks the frames up without a change. Motion blur: the exposure still spans the travel between
# neighbours two positions apart (--blur-step 2), as in the even frames already published. The
# frames overlap by half, and an odd frame looks exactly like its even neighbours. The blurred
# stretches keep the exact ranges of queue-large.sh, because the blur fades in and out at range ends.
# Not rendered: the dwell at the stigma (.raw/<variant>-hold, every position already).
#
# Resumable: frames that exist are skipped. Every stage publishes itself. Run detached, on the PC
# with the RX 9070 on the graphics card:
#   (RS_DEVICE=HIP RS_AFTER=.raw/queue-large.log nohup bash pipeline/blender/queue-dense.sh >> .raw/queue-dense.log 2>&1 &)
# RS_AFTER=<log>: first wait until that log reports one more QUEUE-DONE than at the start (another
# queue is still rendering), or until no renderer has run for five minutes.
# Measured on the RX 9070 (HIP): about 7.5 s per landscape frame at 1440 x 810, 4.5 s per portrait
# frame at 720 x 1280; landscape 335 frames, portrait 237, about one hour in all.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
cd "$ROOT"
T="${RS_THREADS:-10}"

stage() { echo "=== $(date +%H:%M:%S) $*"; }
rendering() { tasklist 2>/dev/null | grep -qi '^blender.exe'; }

if [ -n "${RS_AFTER:-}" ]; then
  finished() { local n; n=$(grep -c "QUEUE-DONE" "$RS_AFTER" 2>/dev/null); echo "${n:-0}"; }
  done_before=$(finished)
  stage "waiting for the queue that logs to $RS_AFTER"
  idle=0
  while [ "$(finished)" -le "$done_before" ]; do
    if rendering; then idle=0; else idle=$((idle + 1)); fi
    [ "$idle" -ge 5 ] && { stage "no renderer for five minutes, going ahead"; break; }
    sleep 60
  done
fi
# one renderer at a time
if rendering; then
  stage "waiting for the running render to finish"
  while rendering; do sleep 15; done
fi

# keep the renderer out of the way of interactive work
( while sleep 30; do powershell.exe -NoProfile -Command "Get-Process blender -ErrorAction SilentlyContinue | ForEach-Object { \$_.PriorityClass = 'Idle' }" >/dev/null 2>&1; done ) &
WATCH=$!
trap 'kill $WATCH 2>/dev/null' EXIT
publish() { node pipeline/images/build-hero.mjs 2>&1; }

# sharp in-betweens. <from> <to>: the odd fine positions in [from, to)
landscape() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range "$1:$2" --mod 8 --rem 1,3,5,7 --res 1440x810 --spp 48 --noise 0.035 --threads "$T" --out .raw/desktop-fine-1440
}
# frames with motion blur, odd positions only. <from> <to> <fade>
landscape_blur() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range "$1:$2" --mod 2 --rem 1 --blur 1 --blur-step 2 --blur-fade "$3" --res 1440x810 --spp 48 --noise 0.035 --threads "$T" --out .raw/desktop-blur-1440
}
portrait_blur() {
  bash "$HERE/render.sh" --variant mobile --mode seq --frames 505 --range "$1:$2" --mod 2 --rem 1 --blur 1 --blur-step 2 --blur-fade 0 --res 720x1280 --spp 48 --noise 0.035 --threads "$T" --out .raw/mobile-blur-720
}

run() {
  case "$1" in
    # landscape: the sharp stretches show the steps most, then the two blurred ones
    a-d-sharp) stage "landscape 1440, odd positions, sharp";                      landscape 0 232; landscape 528 713 ;;
    a-d-into)  stage "landscape 1440, odd positions, into the stigma hold, blur"; landscape_blur 232 265 16 ;;
    a-d-out)   stage "landscape 1440, odd positions, stigma to jar, blur";        landscape_blur 306 529 16 ;;
    # portrait: the whole move is blurred (ranges as in queue-large.sh, no fade, the dwell skipped)
    a-m-blur)  stage "portrait 720, odd positions, motion blur";                  portrait_blur 0 187; portrait_blur 217 505 ;;
    *) echo "unknown stage: $1"; return 1 ;;
  esac
  publish
}

if [ "$#" -eq 0 ]; then set -- a-d-sharp a-d-into a-d-out a-m-blur; fi
for name in "$@"; do run "$name"; done
stage "QUEUE-DONE"
