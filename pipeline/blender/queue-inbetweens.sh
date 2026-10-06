#!/usr/bin/env bash
# In-between frames for the hero camera moves.
#
# The base moves (landscape 90 frames, portrait 64) hold each picture for several screen refreshes;
# scrolled at any speed, the move reads as a slide show with dissolves, not as a camera. This queue
# renders three in-betweens per base step, so the move has four times as many pictures:
# landscape 357, portrait 253. They are rendered at the size of the motion sets (960 x 540 and
# 540 x 960): while the camera moves the page draws the motion set, once it rests the
# full-resolution base frame takes over (src/scripts/journey.ts).
#
# Where the camera travels fast, four times as many sharp pictures are still too far apart
# (node tools/qa/frame-steps.mjs: up to 16 % of the picture width per base step in the landscape
# pan from the stigma to the threads, and most of the portrait move). Those stretches, and the
# landscape pull-back to the jar that follows, are rendered
# with motion blur, like film: the shutter stays open from one in-between to the next, so
# neighbouring frames smear into each other instead of showing the subject twice. Blurred frames
# go to .raw/<variant>-blur and replace the sharp ones in the motion set only
# (pipeline/images/build-hero.mjs); a settled picture always comes from the sharp rest set.
#
# Positions live on a grid of 8 per base step (fine index = base index * 8, landscape 713
# positions, portrait 505); the even positions are used. Base frames are never rendered again.
#
# Resumable: frames that exist are skipped. Every stage publishes itself. Run detached:
#   (nohup bash pipeline/blender/queue-inbetweens.sh >> .raw/queue-fine.log 2>&1 &)
# or name the stages to run:
#   bash pipeline/blender/queue-inbetweens.sh d-pan-blur
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
cd "$ROOT"
T="${RS_THREADS:-10}"

stage() { echo "=== $(date +%H:%M:%S) $*"; }

# one renderer at a time: wait for a render that is still running
if tasklist 2>/dev/null | grep -qi '^blender.exe'; then
  stage "waiting for the running render to finish"
  while tasklist 2>/dev/null | grep -qi '^blender.exe'; do sleep 15; done
fi

# keep the renderer out of the way of interactive work
( while sleep 30; do powershell.exe -NoProfile -Command "Get-Process blender -ErrorAction SilentlyContinue | ForEach-Object { \$_.PriorityClass = 'Idle' }" >/dev/null 2>&1; done ) &
WATCH=$!
trap 'kill $WATCH 2>/dev/null' EXIT
publish() { node pipeline/images/build-hero.mjs 2>&1; }
# RS_NO_FIRST_PUBLISH=1: when frames were moved away to be rendered again, keep serving the
# published ones until their replacements exist
if [ -z "${RS_NO_FIRST_PUBLISH:-}" ]; then
  stage "publishing what exists"
  publish
fi

# sharp in-betweens. <from> <to> <rem>: fine positions in [from, to) with (index % 8) in rem
landscape() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range "$1:$2" --mod 8 --rem "$3" --res 960x540 --spp 48 --noise 0.035 --threads "$T" --out .raw/desktop-fine
}
portrait() {
  bash "$HERE/render.sh" --variant mobile --mode seq --frames 505 --range "$1:$2" --mod 8 --rem "$3" --res 540x960 --spp 48 --noise 0.035 --threads "$T" --out .raw/mobile-fine
}
# frames with motion blur. <from> <to> <mod> <rem> <fade>: the exposure spans the travel between
# neighbours two positions apart (the spacing of the finished motion set); the blur fades in and
# out over <fade> positions at the ends of the stretch
landscape_blur() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range "$1:$2" --mod "$3" --rem "$4" --blur 1 --blur-step 2 --blur-fade "$5" --res 960x540 --spp 48 --noise 0.035 --threads "$T" --out .raw/desktop-blur
}
portrait_blur() {
  bash "$HERE/render.sh" --variant mobile --mode seq --frames 505 --range "$1:$2" --mod "$3" --rem "$4" --blur 1 --blur-step 2 --blur-fade "$5" --res 540x960 --spp 48 --noise 0.035 --threads "$T" --out .raw/mobile-blur
}

# Base frames of a chapter hold, full size and with more samples: these are the pictures people
# rest on. <from> <to> are base frame numbers. Frames that exist are skipped, so on a fresh render
# this stage has to run before the base move reaches them (queue-all.sh does that).
landscape_hold() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 90 --range "$1:$2" --res 1920x1080 --spp 64 --noise 0.03 --threads "$T" --out .raw/desktop
}
portrait_hold() {
  bash "$HERE/render.sh" --variant mobile --mode seq --frames 64 --range "$1:$2" --res 720x1280 --spp 64 --noise 0.03 --threads "$T" --out .raw/mobile
}

# The dwell at the stigma hold: every position of the grid (not only the even ones), sharp, and
# larger than the rest of the motion set, because this is the stretch people scroll through slowly
# and look at. These frames go to .raw/<variant>-hold and win over every other source in the motion
# set (pipeline/images/build-hero.mjs). <from> <to> are fine positions.
landscape_dwell() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range "$1:$2" --res 1440x810 --spp 64 --noise 0.03 --threads "$T" --out .raw/desktop-hold
}
portrait_dwell() {
  bash "$HERE/render.sh" --variant mobile --mode seq --frames 505 --range "$1:$2" --res 720x1280 --spp 64 --noise 0.03 --threads "$T" --out .raw/mobile-hold
}

run() {
  case "$1" in
    # The stigma hold (web_hero.py STIGMA_HOLD): between progress 0.325 and 0.475 the camera leaves
    # the authored path for a macro view of the end of the stigma. Landscape: base frames 29-42,
    # fine positions 232-339, macro view alone at 264-306. Portrait: base frames 21-29, fine
    # positions 164-239, macro view alone at 187-216.
    d-hold)      stage "landscape, stigma hold, base frames 29-42";   landscape_hold 29 43 ;;
    d-dwell)     stage "landscape, stigma dwell, every position";     landscape_dwell 264 307 ;;
    d-hold-blur) stage "landscape, into the stigma hold, motion blur"; landscape_blur 232 265 2 0 16 ;;
    d-hold-fine) stage "landscape, around the stigma hold, sharp";    landscape 232 264 2,4,6; landscape 306 340 2,4,6 ;;
    m-hold)      stage "portrait, stigma hold, base frames 21-29";    portrait_hold 21 30 ;;
    m-dwell)     stage "portrait, stigma dwell, every position";      portrait_dwell 187 217 ;;
    # landscape, sharp: stigma -> threads -> jar first (base frames 40-63), then the rest
    d-fast-2)   stage "landscape, fast stretch, mid-points";        landscape 320 505 4 ;;
    d-fast-4)   stage "landscape, fast stretch, quarter-points";    landscape 320 505 2,6 ;;
    d-rest-2)   stage "landscape, remaining move, mid-points";      landscape 0 320 4; landscape 504 713 4 ;;
    d-rest-4)   stage "landscape, remaining move, quarter-points";  landscape 0 320 2,6; landscape 504 713 2,6 ;;
    # landscape, blurred: out of the stigma hold, across to the threads and back out to the jar.
    # The blur fades to nothing at the chapter holds on its own.
    d-pan-blur) stage "landscape, stigma to jar, motion blur";      landscape_blur 306 529 2 0 16 ;;
    # portrait: the narrow frame travels fast almost everywhere, so the whole motion set is blurred
    m-blur-2)   stage "portrait, motion blur, base and mid-points"; portrait_blur 0 505 4 0 0 ;;
    m-blur-4)   stage "portrait, motion blur, quarter-points";      portrait_blur 0 505 4 2 0 ;;
    # portrait, sharp in-betweens: not part of the default run (superseded by the blurred set)
    m-fast-2)   stage "portrait, fast stretch, mid-points";         portrait 224 361 4 ;;
    m-fast-4)   stage "portrait, fast stretch, quarter-points";     portrait 224 361 2,6 ;;
    m-rest-2)   stage "portrait, remaining move, mid-points";       portrait 0 224 4; portrait 360 505 4 ;;
    m-rest-4)   stage "portrait, remaining move, quarter-points";   portrait 0 224 2,6; portrait 360 505 2,6 ;;
    *) echo "unknown stage: $1"; return 1 ;;
  esac
  publish
}

# landscape first (it is what a desktop preview shows), then portrait
if [ "$#" -eq 0 ]; then set -- d-hold d-dwell d-hold-blur d-fast-2 d-fast-4 d-rest-2 d-pan-blur d-hold-fine d-rest-4 m-hold m-dwell m-blur-2 m-blur-4; fi
for name in "$@"; do run "$name"; done
stage "QUEUE-DONE"
