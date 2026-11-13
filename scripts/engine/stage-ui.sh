#!/usr/bin/env bash
# Build the production sidebar WebUI and stage it for GRIT (//justslide/resources).
source "$(dirname "$0")/../lib.sh"
need bun "https://bun.sh"
SRC="${1:-$CR_SRC}"
(cd "$JS_ROOT/ui/browser-chrome" && bun run build)
dest="$SRC/justslide/resources/webui_dist"
[[ -d "$SRC/justslide" ]] || die "run scripts/engine/apply-patches.sh first"
rm -rf "$dest"; mkdir -p "$dest"
cp "$JS_ROOT"/ui/browser-chrome/dist/webui/* "$dest/"
python3 - "$dest" <<'PY'
import json, os, sys
d = sys.argv[1]
files = sorted(f for f in os.listdir(d) if f not in ('files.json', 'manifest.json'))
json.dump(files, open(os.path.join(d, 'files.json'), 'w'), indent=1)
print(f'staged {len(files)} files')
PY
