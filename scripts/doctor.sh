#!/usr/bin/env bash
# Environment/resource check. Exit 0 = ready for the requested scope.
#   scripts/doctor.sh            # fast checks (UI, protocol, MCP bridge)
#   scripts/doctor.sh --engine   # also Chromium checkout/build prerequisites
source "$(dirname "$0")/lib.sh"
ENGINE=0; [[ "${1:-}" == --engine ]] && ENGINE=1
fail=0; ok() { printf '  ok    %s\n' "$*"; }; bad() { printf '  FAIL  %s\n' "$*"; fail=1; }; note() { printf '  note  %s\n' "$*"; }
echo "JustSlide doctor ($(date -u +%FT%TZ))"
os="$(uname -s)"; cpu="$(host_cpu)"; echo "host: $os $(uname -r) cpu=$cpu ($(uname -m))"
if [[ $os == Darwin ]]; then
  note "macOS $(sw_vers -productVersion) $(sw_vers -buildVersion); model $(sysctl -n hw.model)"
  [[ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" == 1 ]] && note "shell is running under Rosetta; native cpu is arm64"
  ram=$(( $(sysctl -n hw.memsize) / 1073741824 )); cores=$(sysctl -n hw.ncpu)
else
  ram=$(( $(awk '/MemTotal/{print $2}' /proc/meminfo) / 1048576 )); cores=$(nproc)
fi
echo "resources: ${cores} cores, ${ram} GB RAM, $(free_gb "$HOME") GB free in \$HOME"
for t in git python3 curl; do command -v $t >/dev/null && ok "$t $($t --version 2>&1 | head -1)" || bad "$t missing"; done
command -v bun >/dev/null && ok "bun $(bun --version)" || bad "bun missing (https://bun.sh) — needed for ui/ and protocol/"
command -v cargo >/dev/null && ok "$(cargo --version)" || bad "cargo missing (rustup) — needed for mcp/"
if (( ENGINE )); then
  echo "engine checks (checkout at $ENGINE_ROOT):"
  [[ $os == Darwin ]] || note "non-macOS host: macOS builds/runtime tests cannot be verified here"
  (( ram >= 16 )) && ok "RAM ${ram} GB" || bad "RAM ${ram} GB < 16 GB (Chromium links will thrash or fail)"
  (( cores >= 8 )) && ok "cores ${cores}" || note "only ${cores} cores: a full build may take many hours"
  mkdir -p "$ENGINE_ROOT" 2>/dev/null || true
  fg=$(free_gb "$ENGINE_ROOT"); (( fg >= 120 )) && ok "${fg} GB free at $ENGINE_ROOT" || bad "${fg} GB free at $ENGINE_ROOT; need >= 120 GB (checkout ~60 GB + one out dir)"
  if [[ $os == Darwin ]]; then
    fs=$(diskutil info "$(df "$ENGINE_ROOT" | awk 'NR==2{print $1}')" 2>/dev/null | awk -F: '/Type \(Bundle\)/{gsub(/ /,"",$2);print $2}')
    [[ "$fs" == apfs ]] && ok "APFS volume" || bad "volume type '$fs' (Chromium requires APFS)"
    if xcode-select -p >/dev/null 2>&1; then
      sdk=$(xcrun --sdk macosx --show-sdk-version 2>/dev/null || echo none)
      want=$(lock "['toolchain']['macSdkOfficialVersion']")
      ok "Xcode at $(xcode-select -p); macOS SDK $sdk (pinned official: $want)"
      python3 - "$sdk" "$want" <<'PY' || bad "macOS SDK older than pinned official SDK"
import sys; v=lambda s:[int(x) for x in s.split('.') if x.isdigit()]
sys.exit(0 if v(sys.argv[1])>=v(sys.argv[2]) else 1)
PY
    else bad "Xcode not installed (full Xcode required, not just CLT)"; fi
  fi
  [[ -x "$DEPOT_TOOLS/gclient" ]] && ok "depot_tools at $DEPOT_TOOLS" || note "depot_tools not yet cloned (scripts/engine/fetch.sh does it)"
  if [[ -d "$CR_SRC/.git" ]]; then
    head=$(git -C "$CR_SRC" rev-parse HEAD 2>/dev/null || true)
    [[ "$head" == "$PIN_COMMIT"* ]] && ok "checkout at pinned $PIN_TAG" || note "checkout HEAD $head (pinned $PIN_COMMIT; patched checkouts add commits only if using git am)"
  else note "no checkout yet at $CR_SRC"; fi
fi
exit $fail
