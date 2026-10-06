#!/usr/bin/env bash
# The in-between frames once more, larger: landscape 1440 x 810, portrait 720 x 1280.
#
# Why: the motion sets were rendered at 960 x 540 and 540 x 960. On the 2560 px panel of a 16"
# laptop at 150 % scaling those frames are stretched 2.7 times and read as soft and blocky while
# scrolling ("verpixelt"), while the settled 1440/1920 frames look like the renders. Decision of the
# client on 2026-10-06: render the moving frames at the size of the rest sets.
#
# Same positions, sample counts and motion blur as queue-inbetweens.sh; only the size and the
# folder change (.raw/<variant>-fine-<width>, .raw/<variant>-blur-<width>). The landscape blur
# stretches keep the exact ranges of queue-inbetweens.sh, because the blur fades in and out at the
# ends of a range. pipeline/images/build-hero.mjs prefers these frames over the small renders in
# every set and publishes the large motion sets d-1440m and m-720m.
# Not rendered again: base frames (already 1440/1920 and 720), the dwell at the stigma hold
# (.raw/<variant>-hold, already large), the sharp in-betweens under the blurred stretches (used only
# for RS_NO_BLUR builds).
#
# Resumable: frames that exist are skipped. Every stage publishes itself. Run detached:
#   (nohup bash pipeline/blender/queue-large.sh >> .raw/queue-large.log 2>&1 &)
# RS_AFTER=<log>: first wait until that log reports one more QUEUE-DONE than at the start (another
# queue is still rendering), or until no renderer has run for five minutes.
# Measured on this laptop (Ryzen 5 6600HS, CPU only): about 105 s per landscape frame at
# 1440 x 810 and 85 s per portrait frame at 720 x 1280; about 13 hours for the whole queue.
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

stage "publishing what exists"
publish

# sharp in-betweens. <from> <to> <rem>: fine positions in [from, to) with (index % 8) in rem
landscape() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range "$1:$2" --mod 8 --rem "$3" --res 1440x810 --spp 48 --noise 0.035 --threads "$T" --out .raw/desktop-fine-1440
}
# frames with motion blur, flags as in queue-inbetweens.sh. <from> <to> <mod> <rem> <fade>
landscape_blur() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range "$1:$2" --mod "$3" --rem "$4" --blur 1 --blur-step 2 --blur-fade "$5" --res 1440x810 --spp 48 --noise 0.035 --threads "$T" --out .raw/desktop-blur-1440
}
portrait_blur() {
  bash "$HERE/render.sh" --variant mobile --mode seq --frames 505 --range "$1:$2" --mod "$3" --rem "$4" --blur 1 --blur-step 2 --blur-fade "$5" --res 720x1280 --spp 48 --noise 0.035 --threads "$T" --out .raw/mobile-blur-720
}

run() {
  case "$1" in
    # around the stigma hold first (web_hero.py STIGMA_HOLD). Portrait: into and out of the dwell
    # (187-216 is the dwell itself). The portrait blur has no fade at the range ends (fade 0), so
    # its ranges can be split freely.
    l-m-hold)  stage "portrait 720, into and out of the stigma hold, motion blur"; portrait_blur 164 187 2 0 0; portrait_blur 217 239 2 0 0 ;;
    # landscape: the same two blur stretches as d-hold-blur and d-pan-blur, unchanged ranges
    l-d-into)  stage "landscape 1440, into the stigma hold, motion blur";          landscape_blur 232 265 2 0 16 ;;
    l-d-out)   stage "landscape 1440, stigma to jar, motion blur";                 landscape_blur 306 529 2 0 16 ;;
    # landscape, sharp: the opening up to the hold, then the product reveal
    l-d-sharp) stage "landscape 1440, sharp in-betweens";                          landscape 0 232 2,4,6; landscape 528 713 2,4,6 ;;
    # portrait, the rest of the move
    l-m-rest)  stage "portrait 720, rest of the move, motion blur";                portrait_blur 0 164 2 0 0; portrait_blur 239 505 2 0 0 ;;
    *) echo "unknown stage: $1"; return 1 ;;
  esac
  publish
}

if [ "$#" -eq 0 ]; then set -- l-m-hold l-d-into l-d-out l-d-sharp l-m-rest; fi
for name in "$@"; do run "$name"; done
stage "QUEUE-DONE"
