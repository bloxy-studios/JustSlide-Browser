#!/usr/bin/env bash
# Generate an out dir. Configs:
#   baseline  unmodified pinned Chromium (patches must NOT be applied)
#   dev       JustSlide debug component build
#   release   JustSlide non-official optimized build (distribution candidate)
# Optional 2nd arg: target_cpu (x64|arm64); default = native host cpu.
source "$(dirname "$0")/../lib.sh"
cfg="${1:?usage: gn-gen.sh baseline|dev|release [x64|arm64]}"; cpu="${2:-$(host_cpu)}"
export PATH="$PATH:$DEPOT_TOOLS"; need gn "depot_tools"
out="out/$cfg-$cpu"
common="target_cpu=\"$cpu\"
proprietary_codecs=false
ffmpeg_branding=\"Chromium\"
enable_widevine=false
use_official_google_api_keys=false
enable_nacl=false"
case "$cfg" in
  baseline|dev) args="$common
is_debug=true
is_component_build=true
symbol_level=1
dcheck_always_on=true" ;;
  release) args="$common
is_debug=false
is_component_build=false
symbol_level=0
blink_symbol_level=0
chrome_pgo_phase=0" ;;
  *) die "unknown config $cfg" ;;
esac
cd "$CR_SRC"
if [[ "$cfg" == baseline ]] && git apply --reverse --check "$JS_ROOT/patches/chromium/0002-justslide-build-registration.patch" 2>/dev/null; then
  die "baseline must be built from an unpatched checkout (JustSlide patches are applied)"
fi
mkdir -p "$out"; printf '%s\n' "$args" > "$out/args.gn"
gn gen "$out" | tee "$out/justslide_gn_gen.log"
gn args "$out" --list --short --overrides-only > "$out/justslide_gn_args_effective.txt"
info "generated $CR_SRC/$out"
