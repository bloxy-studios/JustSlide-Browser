#!/usr/bin/env bash
# Launch a built JustSlide/Chromium with an isolated, disposable profile.
#   launch.sh dev [x64|arm64] [--persistent] [-- extra chromium args]
# Default profile: a fresh temp dir. --persistent uses the dev product dir
# (~/Library/Application Support/JustSlide Dev). Never Chrome's or Slide's.
source "$(dirname "$0")/../lib.sh"
cfg="${1:?usage: launch.sh baseline|dev|release [cpu] [--persistent] [-- args]}"; shift
cpu="$(host_cpu)"; [[ "${1:-}" == x64 || "${1:-}" == arm64 ]] && { cpu="$1"; shift; }
persistent=0; [[ "${1:-}" == --persistent ]] && { persistent=1; shift; }; [[ "${1:-}" == -- ]] && shift
out="$CR_SRC/out/$cfg-$cpu"
if [[ "$(uname -s)" == Darwin ]]; then
  app=$(ls -d "$out"/*.app 2>/dev/null | head -1); [[ -n "$app" ]] || die "no .app in $out (build first)"
  bin="$app/Contents/MacOS/$(defaults read "$app/Contents/Info" CFBundleExecutable)"
else bin="$out/chrome"; [[ -x "$bin" ]] || die "no chrome binary in $out"; fi
if (( persistent )); then udd_args=(); else udd="$(mktemp -d "${TMPDIR:-/tmp}/justslide-profile.XXXXXX")"; udd_args=("--user-data-dir=$udd"); info "disposable profile: $udd"; fi
# No --no-sandbox, --disable-web-security or remote-debugging ports, ever.
exec "$bin" "${udd_args[@]}" --no-first-run --no-default-browser-check "$@"
