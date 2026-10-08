#!/usr/bin/env bash
# Thin wrapper: run web_hero.py against the untouched production master.
# Usage: pipeline/blender/render.sh --variant desktop --mode still --p 0,1 --res 960x540 --out .raw/tests --tag check
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
# Blender 4.5 LTS: installed on the laptop, unpacked next to Blender 5.1 on the PC with the RX 9070
if [ -z "${BLENDER:-}" ]; then
  for BLENDER in "/c/Program Files/Blender Foundation/Blender 4.5/blender.exe" "/f/3D/Blender/Blender 4.5/blender.exe"; do
    [ -x "$BLENDER" ] && break
  done
fi
MASTER="${RS_MASTER:-$ROOT/../Projektübergabe/royal-spices/blender/royal-spices-master.blend}"
"$BLENDER" -b "$MASTER" --python "$HERE/web_hero.py" -- "$@" 2>&1 | grep -E "RENDERED|DONE|HOLD|Error|Traceback|line [0-9]+|Exception" || true
