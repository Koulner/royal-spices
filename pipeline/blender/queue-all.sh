#!/usr/bin/env bash
# Everything that still has to be rendered, in the order it matters on screen.
# Resumable: sequence frames that already exist are skipped. Run detached:
#   (nohup bash pipeline/blender/queue-all.sh > .raw/queue.log 2>&1 &)
# Base moves, stills and the stigma dwell only. The in-between frames come after this:
# queue-large.sh (1440 x 810 / 720 x 1280, what the large motion sets show) and, for the small
# sets alone, queue-inbetweens.sh.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
cd "$ROOT"
T="${RS_THREADS:-10}"

# keep the renderer out of the way of interactive work
( while sleep 45; do powershell.exe -NoProfile -Command "Get-Process blender -ErrorAction SilentlyContinue | ForEach-Object { \$_.PriorityClass = 'Idle' }" >/dev/null 2>&1; done ) &
WATCH=$!
publish() { node pipeline/images/build-stills.mjs >/dev/null 2>&1; node pipeline/images/build-hero.mjs 2>&1 | tail -n +1; }
stage() { echo "=== $(date +%H:%M:%S) $*"; }

stage "landscape rest frames 2560x1440"
bash "$HERE/render.sh" --variant desktop --mode still --p 0,1 --res 2560x1440 --spp 96 --noise 0.02 --threads "$T" --out .raw/stills --tag desktop
stage "botanical figure"
bash "$HERE/render.sh" --mode anatomy --res 1920x1280 --spp 72 --noise 0.025 --threads "$T" --out .raw/stills
publish
stage "landscape, stigma hold (frames 29-42) at 1920x1080"
bash "$HERE/render.sh" --variant desktop --mode seq --frames 90 --range 29:43 --res 1920x1080 --spp 64 --noise 0.03 --threads "$T" --out .raw/desktop
stage "landscape, stigma dwell (every position 264-306) at 1440x810"
bash "$HERE/render.sh" --variant desktop --mode seq --frames 713 --range 264:307 --res 1440x810 --spp 64 --noise 0.03 --threads "$T" --out .raw/desktop-hold
stage "landscape sequence, macro part (frames 0-54) at 1440x810"
bash "$HERE/render.sh" --variant desktop --mode seq --frames 90 --range 0:55 --res 1440x810 --spp 48 --noise 0.035 --threads "$T" --out .raw/desktop
publish
stage "landscape sequence, product reveal (frames 55-89) at 1920x1080"
bash "$HERE/render.sh" --variant desktop --mode seq --frames 90 --range 55:90 --res 1920x1080 --spp 48 --noise 0.035 --threads "$T" --out .raw/desktop
publish
stage "portrait rest frames 1080x1920"
bash "$HERE/render.sh" --variant mobile --mode still --p 0,1 --res 1080x1920 --spp 96 --noise 0.02 --threads "$T" --out .raw/stills --tag mobile
publish
stage "portrait, stigma hold (frames 21-29) at 720x1280"
bash "$HERE/render.sh" --variant mobile --mode seq --frames 64 --range 21:30 --res 720x1280 --spp 64 --noise 0.03 --threads "$T" --out .raw/mobile
stage "portrait, stigma dwell (every position 187-216) at 720x1280"
bash "$HERE/render.sh" --variant mobile --mode seq --frames 505 --range 187:217 --res 720x1280 --spp 64 --noise 0.03 --threads "$T" --out .raw/mobile-hold
stage "portrait sequence 720x1280"
bash "$HERE/render.sh" --variant mobile --mode seq --frames 64 --res 720x1280 --spp 48 --noise 0.035 --threads "$T" --out .raw/mobile
publish
kill $WATCH 2>/dev/null
stage "QUEUE-DONE"
