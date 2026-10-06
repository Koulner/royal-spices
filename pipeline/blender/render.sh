#!/usr/bin/env bash
# Thin wrapper: run web_hero.py against the untouched production master.
# Usage: pipeline/blender/render.sh --variant desktop --mode still --p 0,1 --res 960x540 --out .raw/tests --tag check
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
BLENDER="${BLENDER:-/c/Program Files/Blender Foundation/Blender 4.5/blender.exe}"
MASTER="${RS_MASTER:-$ROOT/../Projektübergabe/royal-spices/blender/royal-spices-master.blend}"
"$BLENDER" -b "$MASTER" --python "$HERE/web_hero.py" -- "$@" 2>&1 | grep -E "RENDERED|DONE|HOLD|Error|Traceback|line [0-9]+|Exception" || true
