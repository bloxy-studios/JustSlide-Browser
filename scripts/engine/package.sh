#!/usr/bin/env bash
# Package an UNSIGNED developer build with provenance. Does not sign, notarize,
# publish or create certificates (docs/development-and-release.md).
source "$(dirname "$0")/../lib.sh"
cfg="${1:-release}"; cpu="${2:-$(host_cpu)}"; out="$CR_SRC/out/$cfg-$cpu"
[[ "$(uname -s)" == Darwin ]] || die "macOS packaging only"
app=$(ls -d "$out"/*.app | head -1); [[ -n "$app" ]] || die "build $cfg-$cpu first"
dist="$JS_ROOT/dist/engine"; mkdir -p "$dist"
name="JustSlide-Dev-$cfg-$cpu-$(git -C "$JS_ROOT" rev-parse --short HEAD)"
python3 - "$out" "$dist/$name.provenance.json" <<PY
import json, hashlib, os, subprocess, sys
out, dest = sys.argv[1:]
root = "$JS_ROOT"
patches = [l.strip() for l in open(f"{root}/patches/chromium/series") if l.strip() and not l.startswith('#')]
prov = {
  "product": "JustSlide Dev (unsigned developer build)",
  "lock": json.load(open(f"{root}/chromium.lock.json"))["upstream"],
  "justslide_commit": subprocess.run(["git","-C",root,"rev-parse","HEAD"],capture_output=True,text=True).stdout.strip(),
  "patches": {p: hashlib.sha256(open(f"{root}/patches/chromium/{p}","rb").read()).hexdigest() for p in patches},
  "gn_args": open(os.path.join(out,"args.gn")).read(),
  "ui_manifest": json.load(open(f"{root}/ui/browser-chrome/dist/webui/manifest.json")),
  "host": " ".join(os.uname()), "xcode": subprocess.run(["xcodebuild","-version"],capture_output=True,text=True).stdout.strip(),
  "signed": False,
}
json.dump(prov, open(dest,"w"), indent=2)
PY
ditto -c -k --keepParent "$app" "$dist/$name.zip"
info "packaged $dist/$name.zip (+ provenance). Unsigned: Gatekeeper will block it on other machines."
