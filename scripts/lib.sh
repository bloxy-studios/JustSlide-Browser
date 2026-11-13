# Shared helpers for JustSlide scripts (bash). Source, do not execute.
set -euo pipefail
JS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE_ROOT="${JUSTSLIDE_ENGINE_ROOT:-$JS_ROOT/.engine}"   # git-ignored, never tracked (see .gitignore)
CR_SRC="$ENGINE_ROOT/chromium/src"
DEPOT_TOOLS="${JUSTSLIDE_DEPOT_TOOLS:-$ENGINE_ROOT/depot_tools}"
lock() { python3 -c "import json,sys;d=json.load(open('$JS_ROOT/chromium.lock.json'));print(eval('d'+sys.argv[1]))" "$1"; }
PIN_TAG="$(lock "['upstream']['tag']")"
PIN_COMMIT="$(lock "['upstream']['commit']")"
info() { printf '\033[1;34m[justslide]\033[0m %s\n' "$*" >&2; }
warn() { printf '\033[1;33m[justslide] WARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[justslide] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing prerequisite: $1 ($2)"; }
free_gb() { df -Pk "$1" 2>/dev/null | awk 'NR==2{printf "%d", $4/1048576}'; }
host_cpu() {
  local m; m="$(uname -m)"
  if [[ "$(uname -s)" == Darwin && "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" == 1 ]]; then echo arm64; return; fi
  case "$m" in x86_64) echo x64;; arm64|aarch64) echo arm64;; *) echo "$m";; esac
}
