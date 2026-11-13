#!/usr/bin/env bash
# Build targets in an out dir with autoninja; logs kept next to the out dir.
#   build.sh dev [x64|arm64] [targets...]   (default targets: chrome)
source "$(dirname "$0")/../lib.sh"
cfg="${1:?usage: build.sh baseline|dev|release [cpu] [targets...]}"; shift
cpu="$(host_cpu)"; [[ "${1:-}" == x64 || "${1:-}" == arm64 ]] && { cpu="$1"; shift; }
targets=("${@:-chrome}")
export PATH="$PATH:$DEPOT_TOOLS"; need autoninja "depot_tools"
out="out/$cfg-$cpu"; cd "$CR_SRC"; [[ -f "$out/args.gn" ]] || die "run scripts/engine/gn-gen.sh $cfg $cpu first"
log="$CR_SRC/$out/justslide_build_$(date +%Y%m%d-%H%M%S).log"
info "autoninja -C $out ${targets[*]}  (log: $log)"
set +e; autoninja -C "$out" "${targets[@]}" 2>&1 | tee "$log"; rc=${PIPESTATUS[0]}; set -e
python3 - "$CR_SRC/$out" "$cfg" "$cpu" "$rc" <<'PY'
import json, os, subprocess, sys, datetime, hashlib
out, cfg, cpu, rc = sys.argv[1:]
root = os.environ.get('JS_ROOT') or os.getcwd()
prov = {'config': cfg, 'target_cpu': cpu, 'exit_code': int(rc), 'built_at': datetime.datetime.utcnow().isoformat() + 'Z',
        'chromium_head': subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip(),
        'host': os.uname().sysname + ' ' + os.uname().machine}
open(os.path.join(out, 'justslide_build_status.json'), 'w').write(json.dumps(prov, indent=2))
PY
exit "$rc"
