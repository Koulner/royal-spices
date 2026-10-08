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
# .raw/queue-large.pause: do not render while this file exists (camera and stigma still being
# reworked, 2026-10-06 evening). Delete it to let the queue go on. (.raw/queue-large.hold holds a
# queue started before this version; keep it until that process is gone.)
if [ -e .raw/queue-large.pause ]; then
  stage "on hold until .raw/queue-large.pause is deleted"
  while [ -e .raw/queue-large.pause ]; do sleep 60; done
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
# Stills and chapter pictures are rebuilt only once every source exists again (build-stills.mjs
# would drop a missing one from the page).
STILL_SOURCES=".raw/desktop/0012.png .raw/desktop/0036.png .raw/desktop/0050.png .raw/desktop/0062.png .raw/stills/desktop_p0000.png .raw/stills/desktop_p1000.png .raw/stills/mobile_p0000.png .raw/stills/mobile_p1000.png .raw/stills/anatomy.png"
publish() {
  local missing=0 f
  for f in $STILL_SOURCES; do [ -e "$f" ] || missing=1; done
  [ "$missing" -eq 0 ] && node pipeline/images/build-stills.mjs 2>&1 | tail -n 3
  node pipeline/images/build-hero.mjs 2>&1
}

stage "publishing what exists"
publish

# 2026-10-06 evening: the stigma ends were reworked (web_hero.py refine_stigma_ends), the camera
# leaves the stigma hold differently (leave_hold) and the portrait move shows the landscape shots
# from the product on. Every frame that shows the flower or changed its path is rendered again,
# base frames and stills included; the replaced files are in .raw/prev-swing/.

# base frames. <from> <to> <resolution> <samples> <noise>
base_d() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 90 --range "$1:$2" --res "$3" --spp "$4" --noise "$5" --threads "$T" --out .raw/desktop
}
base_m() {
  bash "$HERE/render.sh" --variant mobile --mode seq --frames 64 --range "$1:$2" --res 720x1280 --spp "$3" --noise "$4" --threads "$T" --out .raw/mobile
}
# the dwell at the stigma hold: every position, sharp, large
dwell_d() {
  bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range 264:307 --res 1440x810 --spp 64 --noise 0.03 --threads "$T" --out .raw/desktop-hold
}
dwell_m() {
  bash "$HERE/render.sh" --variant mobile --mode seq --frames 505 --range 187:217 --res 720x1280 --spp 64 --noise 0.03 --threads "$T" --out .raw/mobile-hold
}
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
# stills (still mode renders every time: only the missing ones). <variant> <resolution>
stills() {
  local ps="" p
  for p in 0 1; do [ -e ".raw/stills/$1_p${p}000.png" ] || ps="$ps${ps:+,}$p"; done
  [ -n "$ps" ] && bash "$HERE/render.sh" --variant "$1" --mode still --p "$ps" --res "$2" --spp 96 --noise 0.02 --threads "$T" --out .raw/stills --tag "$1"
  return 0
}

run() {
  case "$1" in
    # landscape around the stigma first: what the client looks at first
    s-d-hold)   stage "landscape base frames 29-49: stigma hold and the way to the threads"; base_d 29 43 1920x1080 64 0.03; base_d 43 50 1440x810 48 0.035 ;;
    s-d-dwell)  stage "landscape dwell at the stigma, every position 264-306";            dwell_d ;;
    # the two blur stretches keep the exact ranges of queue-inbetweens.sh (the blur fades at range ends)
    l-d-into)   stage "landscape 1440, into the stigma hold, motion blur";                landscape_blur 232 265 2 0 16 ;;
    l-d-out)    stage "landscape 1440, stigma to jar, motion blur";                       landscape_blur 306 529 2 0 16 ;;
    s-d-open)   stage "landscape base frames 0-28: the opening";                          base_d 0 29 1440x810 48 0.035 ;;
    l-d-sharp)  stage "landscape 1440, sharp in-betweens";                                landscape 0 232 2,4,6; landscape 528 713 2,4,6 ;;
    s-d-reveal) stage "landscape base frames 50-89: threads and product";                 base_d 50 55 1440x810 48 0.035; base_d 55 90 1920x1080 48 0.035 ;;
    s-d-stills) stage "landscape stills 2560x1440 and the botanical figure";              stills desktop 2560x1440
                [ -e .raw/stills/anatomy.png ] || bash "$HERE/render.sh" --mode anatomy --res 1920x1280 --spp 72 --noise 0.025 --threads "$T" --out .raw/stills ;;
    # portrait
    s-m-base)   stage "portrait base frames 0-63";                                        base_m 21 30 64 0.03; base_m 0 21 48 0.035; base_m 30 64 48 0.035 ;;
    s-m-dwell)  stage "portrait dwell at the stigma, every position 187-216";             dwell_m ;;
    # portrait blur: no fade at the range ends (fade 0), so its ranges can be split freely
    l-m-hold)   stage "portrait 720, into and out of the stigma hold, motion blur";       portrait_blur 164 187 2 0 0; portrait_blur 217 239 2 0 0 ;;
    l-m-rest)   stage "portrait 720, rest of the move, motion blur";                      portrait_blur 0 164 2 0 0; portrait_blur 239 505 2 0 0 ;;
    s-m-stills) stage "portrait stills 1080x1920";                                        stills mobile 1080x1920 ;;
    *) echo "unknown stage: $1"; return 1 ;;
  esac
  publish
}

if [ "$#" -eq 0 ]; then set -- s-d-hold s-d-dwell l-d-into l-d-out s-d-open l-d-sharp s-d-reveal s-d-stills s-m-stills s-m-base s-m-dwell l-m-hold l-m-rest; fi
for name in "$@"; do run "$name"; done
stage "QUEUE-DONE"
