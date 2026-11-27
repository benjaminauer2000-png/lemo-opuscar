#!/bin/sh
# One command: STEP → parts → events → picture → score/foley/mix → master → poster.
# Needs: the library's core tier (setup.sh deps), the VCSL/VSCO2CE/Karoryfer sample packs (fetched by the sampler),
# the customer's STEP files in cad/ (not in git), and ffmpeg 7 on PATH (FFMPEG7_DIR may point to a folder that holds it).
# On a machine without a GPU: LEMO_ANGLE=swiftshader sh build.sh  (about 1.5–2 h for the picture).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
[ -n "$FFMPEG7_DIR" ] && PATH="$FFMPEG7_DIR:$PATH"
PY="$LIB/.venv/bin/python"
cd "$LIB"
"$PY" core/audio/sampler.py --need "$HERE/mix.py"
if [ ! -f "$HERE/data/parts.bin" ]; then
  [ -d "$HERE/cadtool/node_modules/occt-import-js" ] || (cd "$HERE/cadtool" && npm install occt-import-js@0.0.23 --silent)
  node "$HERE/tools/step2parts.mjs" "$HERE/cad/E122021V12OD8LKW-G14-ZG.STEP" "$HERE/data/parts"
  node "$HERE/tools/step2parts.mjs" "$HERE/cad/E122021V12OD8LKW-G14.STEP" "$HERE/data/parts_x"
  node -e "const a=require('$HERE/data/parts.json'),x=require('$HERE/data/parts_x.json');require('fs').writeFileSync('$HERE/data/explode.json',JSON.stringify(a.map((p,i)=>[0,1,2].map(j=>+(x[i].bb[j]-p.bb[j]).toFixed(2)))))"
  rm -f "$HERE/data/parts_x.bin"
fi
node core/render/events.mjs "$HERE"
node core/render/readcheck.mjs "$HERE" --q 'nogl=1' --step 0.05
node core/render/video.mjs "$HERE" --fps 24 --workers 2 --q 'ss=1.5' --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/auer-hydraulikaggregat.mp4" 24 1
ffmpeg -y -loglevel error -ss 18.0 -i "$HERE/auer-hydraulikaggregat.mp4" -frames:v 1 -q:v 2 "$HERE/poster.jpg"
echo "done: $HERE/auer-hydraulikaggregat.mp4"
