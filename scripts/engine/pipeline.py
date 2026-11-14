#!/usr/bin/env python3
"""JustSlide engine pipeline: resumable, time-bounded Chromium fetch/build/verify.

Why this exists
---------------
A Chromium checkout + build takes many hours. Remote build runners (e.g. the
SimBridge integration on the owner's Mac) cap a single job at 60 minutes and
give no interactive shell. This script therefore runs as a *state machine*:
every invocation resumes at the first unfinished step, runs steps until the
time budget is spent, stops long-running children cleanly (ninja and gclient
both resume from where they stopped), records state, and prints a compact
status report. Re-run it until `--status` shows every step `done`.

It never uses --force, never resets a Chromium checkout with local changes,
never disables the sandbox, and never touches anything outside ENGINE_ROOT
(default: <repo>/.engine, git-ignored) except reading the product repo.

Usage
-----
  python3 scripts/engine/pipeline.py              # run next steps (52 min budget)
  python3 scripts/engine/pipeline.py --budget-min 25
  python3 scripts/engine/pipeline.py --until verify_baseline
  python3 scripts/engine/pipeline.py --only build_justslide   # (re)run one step
  python3 scripts/engine/pipeline.py --redo patch             # mark step + later steps pending
  python3 scripts/engine/pipeline.py --status
  python3 scripts/engine/pipeline.py --errors                 # first compile errors of last build

Exit codes: 0 = all requested steps done, 10 = budget spent (re-run to
continue), 1 = a step failed (see report), 2 = usage/precondition error.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

JS_ROOT = Path(__file__).resolve().parents[2]
LOCK = json.loads((JS_ROOT / "chromium.lock.json").read_text())
PIN_TAG = LOCK["upstream"]["tag"]
PIN_COMMIT = LOCK["upstream"]["commit"]
CR_URL = LOCK["upstream"]["repository"]
ENGINE_ROOT = Path(os.environ.get("JUSTSLIDE_ENGINE_ROOT", JS_ROOT / ".engine")).resolve()
CR_ROOT = ENGINE_ROOT / "chromium"
CR_SRC = CR_ROOT / "src"
DEPOT = Path(os.environ.get("JUSTSLIDE_DEPOT_TOOLS", ENGINE_ROOT / "depot_tools"))
STATE_FILE = ENGINE_ROOT / "state.json"
LOG_DIR = ENGINE_ROOT / "logs"
EVID = ENGINE_ROOT / "evidence"
OUT_NAME = os.environ.get("JUSTSLIDE_OUT", "JustSlide" + ("-arm64" if os.environ.get("JUSTSLIDE_TARGET_CPU") == "arm64" else ""))
OUT = CR_SRC / "out" / OUT_NAME
MIN_FREE_GB_BEFORE_SYNC = int(os.environ.get("JUSTSLIDE_MIN_FREE_GB", "45"))

STEPS = [
    "doctor", "depot_tools", "src_checkout", "gclient_sync", "runhooks",
    "gn_baseline", "build_baseline", "verify_baseline",
    "ui_install", "patch", "stage_ui", "gn_justslide", "build_justslide", "verify_justslide",
]

# ---------------------------------------------------------------- utilities

def now() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def say(msg: str) -> None:
    print(f"[justslide {time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"pin": PIN_COMMIT, "steps": {}}


def save_state(st: dict) -> None:
    ENGINE_ROOT.mkdir(parents=True, exist_ok=True)
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(st, indent=2))
    tmp.replace(STATE_FILE)


def free_gb(p: Path) -> float:
    p = p if p.exists() else p.parent
    while not p.exists():
        p = p.parent
    u = shutil.disk_usage(p)
    return round(u.free / 1e9, 1)


def host_info() -> dict:
    info = {"system": platform.system(), "machine": platform.machine(), "python": platform.python_version()}
    if info["system"] == "Darwin":
        def sc(k):
            return subprocess.run(["sysctl", "-n", k], capture_output=True, text=True).stdout.strip()
        info.update({
            "macos": subprocess.run(["sw_vers", "-productVersion"], capture_output=True, text=True).stdout.strip(),
            "macos_build": subprocess.run(["sw_vers", "-buildVersion"], capture_output=True, text=True).stdout.strip(),
            "model": sc("hw.model"), "cpu_brand": sc("machdep.cpu.brand_string"),
            "ncpu": int(sc("hw.ncpu") or 0), "ram_gb": round(int(sc("hw.memsize") or 0) / 2**30, 1),
            "rosetta": sc("sysctl.proc_translated") == "1",
        })
    else:
        info["ncpu"] = os.cpu_count()
        try:
            info["ram_gb"] = round(int(open("/proc/meminfo").read().split()[1]) / 2**20, 1)
        except Exception:
            info["ram_gb"] = None
    return info


def build_jobs() -> int:
    h = host_info()
    ncpu = h.get("ncpu") or 2
    ram = h.get("ram_gb") or 8
    if os.environ.get("JUSTSLIDE_JOBS"):
        return max(1, int(os.environ["JUSTSLIDE_JOBS"]))
    # ~2 GB per clang job for a symbol-less release component build, keeping
    # ~2 GB for macOS itself (8 GB Mac => -j3).
    return max(2, min(ncpu, int((ram - 2) / 2)))


def env_with_depot() -> dict:
    e = dict(os.environ)
    e["PATH"] = f"{DEPOT}{os.pathsep}{e.get('PATH', '')}"
    e.setdefault("DEPOT_TOOLS_METRICS", "0")
    e["GCLIENT_SUPPRESS_GIT_VERSION_WARNING"] = "1"
    # depot_tools updates itself on first use; afterwards keep it stable per run.
    if (DEPOT / ".justslide_bootstrapped").exists():
        e.setdefault("DEPOT_TOOLS_UPDATE", "0")
    return e


class Budget:
    def __init__(self, minutes: float):
        self.deadline = time.monotonic() + minutes * 60

    def left(self) -> float:
        return self.deadline - time.monotonic()


class OutOfTime(Exception):
    pass


class StepFailed(Exception):
    pass


def run(cmd, *, cwd=None, budget: Budget | None = None, log: Path, env=None, interrupt=signal.SIGINT,
        check=True, tail_to_stdout=25, progress_re: str | None = None) -> int:
    """Run cmd in its own process group; full output to `log`, a short tail to stdout.

    If the budget runs out the group gets `interrupt` (SIGINT lets ninja/gclient
    stop cleanly), then SIGTERM, then SIGKILL; raises OutOfTime.
    """
    log.parent.mkdir(parents=True, exist_ok=True)
    say(f"$ {' '.join(map(str, cmd))}  (cwd={cwd or os.getcwd()}, log={log.name})")
    with open(log, "a", buffering=1) as lf:
        lf.write(f"\n===== {now()} $ {' '.join(map(str, cmd))}\n")
        p = subprocess.Popen(list(map(str, cmd)), cwd=cwd, env=env, stdout=lf, stderr=subprocess.STDOUT,
                             start_new_session=True)
        last_progress = time.monotonic()
        while True:
            try:
                rc = p.wait(timeout=5)
                break
            except subprocess.TimeoutExpired:
                pass
            if progress_re and time.monotonic() - last_progress > 300:
                last_progress = time.monotonic()
                m = last_match(log, progress_re)
                if m:
                    say(f"  progress: {m}")
            if budget and budget.left() <= 0:
                say("  budget spent; stopping child cleanly (it resumes on the next run)")
                for sig, wait in ((interrupt, 90), (signal.SIGTERM, 30), (signal.SIGKILL, 10)):
                    try:
                        os.killpg(p.pid, sig)
                    except ProcessLookupError:
                        break
                    try:
                        p.wait(timeout=wait)
                        break
                    except subprocess.TimeoutExpired:
                        continue
                lf.write(f"===== {now()} stopped: budget spent\n")
                raise OutOfTime()
        lf.write(f"===== {now()} exit {rc}\n")
    if tail_to_stdout:
        lines = log.read_text(errors="replace").splitlines()
        for ln in lines[-tail_to_stdout:]:
            print("  | " + ln[:300])
    if check and rc != 0:
        raise StepFailed(f"{cmd[0]} exited {rc} (log {log})")
    return rc


def last_match(log: Path, pattern: str) -> str | None:
    try:
        with open(log, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 200_000))
            data = f.read().decode(errors="replace")
    except FileNotFoundError:
        return None
    ms = re.findall(pattern, data)
    return ms[-1] if ms else None


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def gn_args(extra: dict | None = None) -> str:
    h = host_info()
    host_cpu = "arm64" if (h["machine"] == "arm64" or h.get("rosetta")) else "x64"
    # JUSTSLIDE_TARGET_CPU=arm64 cross-compiles an Apple Silicon build on an
    # Intel Mac (supported by Chromium's mac toolchain); it cannot be launched
    # or tested on the Intel host. A universal .app is assembled later from an
    # x64 and an arm64 out dir with chrome/installer/mac/universalizer.py.
    cpu = os.environ.get("JUSTSLIDE_TARGET_CPU", host_cpu)
    if cpu not in ("x64", "arm64"):
        raise StepFailed(f"JUSTSLIDE_TARGET_CPU must be x64 or arm64, not {cpu}")
    args = {
        "target_cpu": f'"{cpu}"',
        # Lean development build sized for a 16 GB RAM / ~70 GB free Mac:
        # optimized component build without debug symbols.
        "is_debug": "false",
        "is_component_build": "true",
        "symbol_level": "0",
        "blink_symbol_level": "0",
        "v8_symbol_level": "0",
        "dcheck_always_on": "true",
        "proprietary_codecs": "false",
        'ffmpeg_branding': '"Chromium"',
        "enable_widevine": "false",
        "use_official_google_api_keys": "false",
        "chrome_pgo_phase": "0",
        "use_remoteexec": "false",
        # Low-RAM hosts: one link at a time (chrome links need several GB).
        "concurrent_links": "1" if (h.get("ram_gb") or 8) < 16 else "2",
    }
    args.update(extra or {})
    return "".join(f"{k} = {v}\n" for k, v in args.items())


def patches_applied() -> bool:
    p = JS_ROOT / "patches/chromium/0002-justslide-build-registration.patch"
    r = subprocess.run(["git", "-C", str(CR_SRC), "apply", "--reverse", "--check", str(p)], capture_output=True)
    return r.returncode == 0


def find_app() -> Path | None:
    apps = sorted(OUT.glob("*.app")) if OUT.exists() else []
    return apps[0] if apps else None


def app_binary(app: Path) -> Path:
    import plistlib
    info = plistlib.loads((app / "Contents/Info.plist").read_bytes())
    return app / "Contents/MacOS" / info["CFBundleExecutable"]


# ---------------------------------------------------------------- steps

def step_doctor(b: Budget, st: dict) -> dict:
    h = host_info()
    res = {"host": h, "free_gb_engine": free_gb(ENGINE_ROOT), "engine_root": str(ENGINE_ROOT)}
    problems, notes = [], []
    if h["system"] != "Darwin":
        problems.append("not macOS: this pipeline builds the macOS browser and must run on a Mac")
    else:
        xs = subprocess.run(["xcode-select", "-p"], capture_output=True, text=True)
        res["xcode_select"] = xs.stdout.strip()
        xv = subprocess.run(["xcodebuild", "-version"], capture_output=True, text=True)
        res["xcodebuild"] = " ".join(xv.stdout.split())
        sdk = subprocess.run(["xcrun", "--sdk", "macosx", "--show-sdk-version"], capture_output=True, text=True)
        res["macos_sdk"] = sdk.stdout.strip()
        if "CommandLineTools" in res["xcode_select"]:
            problems.append("xcode-select points at CommandLineTools; full Xcode is required")
        try:
            if float(res["macos_sdk"].split(".")[0]) < 15:
                problems.append(f"macOS SDK {res['macos_sdk']} < mac_sdk_min 15 (build/config/mac/mac_sdk_overrides.gni)")
        except ValueError:
            problems.append("could not read macOS SDK version")
        fs = subprocess.run(["diskutil", "info", "/"], capture_output=True, text=True).stdout
        res["apfs"] = "APFS" in fs
        if (h.get("ram_gb") or 0) < 16:
            notes.append(f"RAM {h.get('ram_gb')} GB < 16 GB: build uses -j{build_jobs()}; expect a slow build")
    sync_done = st["steps"].get("gclient_sync", {}).get("state") == "done"
    if not sync_done and res["free_gb_engine"] < MIN_FREE_GB_BEFORE_SYNC:
        problems.append(f"only {res['free_gb_engine']} GB free; need >= {MIN_FREE_GB_BEFORE_SYNC} GB before sync "
                        "(lean checkout ~30-35 GB + out dir ~15-20 GB)")
    for tool in ("git", "python3", "curl"):
        res[tool] = shutil.which(tool)
        if not res[tool]:
            problems.append(f"{tool} missing")
    res["bun"] = shutil.which("bun") or next((str(p) for p in [Path.home() / ".bun/bin/bun"] if p.exists()), None)
    if not res["bun"]:
        notes.append("bun not on PATH: needed later for stage_ui")
    res["build_jobs"] = build_jobs()
    res["problems"], res["notes"] = problems, notes
    EVID.mkdir(parents=True, exist_ok=True)
    (EVID / "doctor.json").write_text(json.dumps(res, indent=2))
    print(json.dumps(res, indent=2))
    if problems:
        raise StepFailed("; ".join(problems))
    return res


def step_depot_tools(b: Budget, st: dict) -> dict:
    if not (DEPOT / "gclient").exists():
        run(["git", "clone", "--depth", "1", "https://chromium.googlesource.com/chromium/tools/depot_tools.git",
             DEPOT], log=LOG_DIR / "depot_tools.log", budget=b)
    # First invocation bootstraps depot_tools' own python/cipd.
    run([DEPOT / "gclient", "--version"], log=LOG_DIR / "depot_tools.log", budget=b, env=env_with_depot())
    (DEPOT / ".justslide_bootstrapped").write_text(now())
    rev = subprocess.run(["git", "-C", str(DEPOT), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    return {"depot_tools_rev": rev}


def step_src_checkout(b: Budget, st: dict) -> dict:
    CR_ROOT.mkdir(parents=True, exist_ok=True)
    gclient_file = CR_ROOT / ".gclient"
    if not gclient_file.exists():
        gclient_file.write_text(
            "solutions = [{\n"
            '  "name": "src",\n'
            f'  "url": "{CR_URL}",\n'
            '  "managed": False,\n'
            '  "custom_deps": {},\n'
            '  "custom_vars": {},\n'
            "}]\n")
    log = LOG_DIR / "src_checkout.log"
    if not (CR_SRC / ".git").exists():
        CR_SRC.mkdir(parents=True, exist_ok=True)
        run(["git", "init", "-q"], cwd=CR_SRC, log=log)
        run(["git", "remote", "add", "origin", CR_URL], cwd=CR_SRC, log=log)
    head = subprocess.run(["git", "-C", str(CR_SRC), "rev-parse", "-q", "--verify", "HEAD"],
                          capture_output=True, text=True).stdout.strip()
    if head != PIN_COMMIT:
        dirty = subprocess.run(["git", "-C", str(CR_SRC), "status", "--porcelain", "--untracked-files=no"],
                               capture_output=True, text=True).stdout.strip()
        if head and dirty:
            raise StepFailed("chromium/src has local modifications; refusing to change revision")
        # Shallow fetch of exactly the pinned tag: no tip-of-tree download.
        run(["git", "fetch", "--depth=1", "--no-tags", "origin", f"+refs/tags/{PIN_TAG}:refs/tags/{PIN_TAG}"],
            cwd=CR_SRC, log=log, budget=b, progress_re=r"Receiving objects:\s+\d+%[^\r\n]*")
        run(["git", "checkout", "-q", "--detach", f"refs/tags/{PIN_TAG}"], cwd=CR_SRC, log=log, budget=b)
        head = subprocess.run(["git", "-C", str(CR_SRC), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    if head != PIN_COMMIT:
        raise StepFailed(f"tag {PIN_TAG} resolved to {head}, lock says {PIN_COMMIT}")
    return {"head": head, "free_gb": free_gb(ENGINE_ROOT)}


def clean_bad_scm() -> None:
    bad = CR_ROOT / "_bad_scm"
    if bad.exists():
        say(f"removing interrupted partial checkouts in {bad} to reclaim disk")
        shutil.rmtree(bad, ignore_errors=True)


def step_gclient_sync(b: Budget, st: dict) -> dict:
    clean_bad_scm()
    env = env_with_depot()
    run([DEPOT / "gclient", "sync", "--nohooks", "--no-history", "--shallow", "-D", "--jobs", "8",
         "--revision", f"src@{PIN_COMMIT}"],
        cwd=CR_ROOT, log=LOG_DIR / "gclient_sync.log", budget=b, env=env)
    clean_bad_scm()
    return {"free_gb": free_gb(ENGINE_ROOT)}


def step_runhooks(b: Budget, st: dict) -> dict:
    run([DEPOT / "gclient", "runhooks", "--jobs", "8"], cwd=CR_ROOT, log=LOG_DIR / "runhooks.log", budget=b,
        env=env_with_depot())
    return {"free_gb": free_gb(ENGINE_ROOT)}


def gn_gen(b: Budget, tag: str) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "args.gn").write_text(gn_args())
    log = LOG_DIR / f"gn_{tag}.log"
    run([DEPOT / "gn", "gen", OUT], cwd=CR_SRC, log=log, budget=b, env=env_with_depot())
    eff = subprocess.run([str(DEPOT / "gn"), "args", str(OUT), "--list", "--short", "--overrides-only"],
                         cwd=CR_SRC, capture_output=True, text=True, env=env_with_depot()).stdout
    (EVID / f"gn_args_{tag}.txt").write_text(eff)
    return {"out": str(OUT), "args": gn_args()}


def step_gn_baseline(b: Budget, st: dict) -> dict:
    if patches_applied():
        raise StepFailed("JustSlide patches are applied; the baseline must be built from unpatched Chromium")
    return gn_gen(b, "baseline")


def ensure_metal_toolchain(b: Budget) -> dict:
    """Xcode 26 ships without the Metal shader compiler; ANGLE's Metal backend
    (Chromium's macOS GPU path) needs it. Install it on demand (no sudo needed)."""
    if platform.system() != "Darwin":
        return {"metal": "n/a"}
    def ok() -> bool:
        r = subprocess.run(["xcrun", "metal", "--version"], capture_output=True, text=True)
        return r.returncode == 0 and "missing Metal Toolchain" not in (r.stdout + r.stderr)
    if ok():
        return {"metal": "present"}
    say("Metal Toolchain missing: xcodebuild -downloadComponent MetalToolchain")
    run(["xcodebuild", "-downloadComponent", "MetalToolchain"], log=LOG_DIR / "metal_toolchain.log", budget=b,
        tail_to_stdout=15)
    if not ok():
        raise StepFailed("Metal Toolchain still unavailable after download; run "
                         "`xcodebuild -downloadComponent MetalToolchain` on the Mac (Xcode > Settings > Components)")
    return {"metal": "installed"}


def build(b: Budget, tag: str, targets=("chrome",)) -> dict:
    ensure_metal_toolchain(b)
    log = LOG_DIR / f"build_{tag}.log"
    jobs = build_jobs()
    t0 = time.time()
    run([DEPOT / "autoninja", "-C", OUT, f"-j{jobs}", *targets], cwd=CR_SRC, log=log, budget=b,
        env=env_with_depot(), progress_re=r"\[\d+/\d+\][^\n]{0,80}", tail_to_stdout=40)
    return {"targets": list(targets), "jobs": jobs, "seconds_this_run": int(time.time() - t0),
            "free_gb": free_gb(ENGINE_ROOT)}


def step_build_baseline(b: Budget, st: dict) -> dict:
    if patches_applied():
        raise StepFailed("patches applied; baseline build would not be a baseline")
    return build(b, "baseline")


def headless_checks(tag: str) -> dict:
    app = find_app()
    if not app:
        raise StepFailed(f"no .app bundle in {OUT}")
    binp = app_binary(app)
    ver = subprocess.run([str(binp), "--version"], capture_output=True, text=True, timeout=120)
    import plistlib
    info = plistlib.loads((app / "Contents/Info.plist").read_bytes())
    prof = Path(subprocess.run(["mktemp", "-d", "/tmp/justslide-verify.XXXXXX"], capture_output=True,
                               text=True).stdout.strip())
    fixture = JS_ROOT / "tests/fixtures/pages/typing.html"
    shot = EVID / f"{tag}-headless.png"
    if shot.exists():
        shot.unlink()
    common = [str(binp), f"--user-data-dir={prof}", "--no-first-run", "--no-default-browser-check",
              "--headless", "--window-size=1280,800"]
    dom = subprocess.run(common + ["--dump-dom", fixture.as_uri()], capture_output=True, text=True, timeout=180)
    subprocess.run(common + [f"--screenshot={shot}", fixture.as_uri()], capture_output=True, text=True, timeout=180)
    res = {
        "app": str(app), "bundle_id": info.get("CFBundleIdentifier"), "bundle_name": info.get("CFBundleName"),
        "executable": info.get("CFBundleExecutable"), "version_output": ver.stdout.strip() or ver.stderr.strip()[-300:],
        "binary_sha256": sha256(binp),
        "dump_dom_ok": "<input" in dom.stdout and dom.returncode == 0,
        "dump_dom_bytes": len(dom.stdout),
        "screenshot": str(shot), "screenshot_bytes": shot.stat().st_size if shot.exists() else 0,
        "checked_at": now(),
    }
    shutil.rmtree(prof, ignore_errors=True)
    (EVID / f"{tag}.json").write_text(json.dumps(res, indent=2))
    print(json.dumps(res, indent=2))
    if os.environ.get("JUSTSLIDE_TARGET_CPU", "") == "arm64" and platform.machine() != "arm64":
        res["note"] = "cross-compiled arm64 build: not runnable on this Intel host"
        return res
    if not (res["dump_dom_ok"] and res["screenshot_bytes"] > 1000 and PIN_TAG in res["version_output"]):
        raise StepFailed(f"{tag} verification failed (see {EVID / (tag + '.json')})")
    return res


def step_verify_baseline(b: Budget, st: dict) -> dict:
    return headless_checks("baseline")


def bun_bin() -> str:
    return shutil.which("bun") or str(Path.home() / ".bun/bin/bun")


def step_ui_install(b: Budget, st: dict) -> dict:
    run([bun_bin(), "install", "--frozen-lockfile"], cwd=JS_ROOT, log=LOG_DIR / "ui_install.log", budget=b)
    return {}


def step_patch(b: Budget, st: dict) -> dict:
    run(["bash", JS_ROOT / "scripts/engine/apply-patches.sh", CR_SRC], cwd=JS_ROOT, log=LOG_DIR / "patch.log",
        budget=b, env={**os.environ, "JUSTSLIDE_ENGINE_ROOT": str(ENGINE_ROOT)})
    return {"patches": [l for l in (JS_ROOT / "patches/chromium/series").read_text().splitlines()
                        if l and not l.startswith("#")]}


def step_stage_ui(b: Budget, st: dict) -> dict:
    env = {**os.environ, "JUSTSLIDE_ENGINE_ROOT": str(ENGINE_ROOT),
           "PATH": f"{Path(bun_bin()).parent}{os.pathsep}{os.environ.get('PATH', '')}"}
    run(["bash", JS_ROOT / "scripts/engine/stage-ui.sh", CR_SRC], cwd=JS_ROOT, log=LOG_DIR / "stage_ui.log",
        budget=b, env=env)
    return {}


def step_gn_justslide(b: Budget, st: dict) -> dict:
    if not patches_applied():
        raise StepFailed("patches not applied (run step patch)")
    return gn_gen(b, "justslide")


def step_build_justslide(b: Budget, st: dict) -> dict:
    # Re-sync product sources each time so pushed C++ fixes are picked up.
    step_patch(b, st)
    step_stage_ui(b, st)
    return build(b, "justslide", targets=("chrome",))


def step_verify_justslide(b: Budget, st: dict) -> dict:
    res = headless_checks("justslide")
    if not (res["bundle_id"] or "").startswith("app.justslide."):
        raise StepFailed(f"bundle id {res['bundle_id']} is not a JustSlide identity")
    return res


STEP_FUNCS = {name: globals()[f"step_{name}"] for name in STEPS}

# ---------------------------------------------------------------- reporting

def first_errors(log: Path, limit=60) -> str:
    if not log.exists():
        return f"(no log {log})"
    lines = log.read_text(errors="replace").splitlines()
    out, grab = [], 0
    for ln in lines:
        if ln.startswith("FAILED:") or re.search(r"\berror:", ln) or "ERROR at" in ln:
            grab = 6
        if grab:
            out.append(ln[:400])
            grab -= 1
        if len(out) >= limit:
            break
    return "\n".join(out) or "(no error lines found; see log tail)"


def status_report(st: dict) -> dict:
    rep = {"engine_root": str(ENGINE_ROOT), "pin": f"{PIN_TAG} {PIN_COMMIT[:12]}", "free_gb": free_gb(ENGINE_ROOT),
           "steps": {}}
    for s in STEPS:
        e = st["steps"].get(s, {})
        rep["steps"][s] = e.get("state", "pending") + (f" ({e.get('updated')})" if e.get("updated") else "")
    for tag in ("baseline", "justslide"):
        m = last_match(LOG_DIR / f"build_{tag}.log", r"\[\d+/\d+\]")
        if m:
            rep[f"ninja_progress_{tag}"] = m
    return rep


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--budget-min", type=float, default=float(os.environ.get("JUSTSLIDE_BUDGET_MIN", 52)))
    ap.add_argument("--until")
    ap.add_argument("--only")
    ap.add_argument("--redo")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--errors", nargs="?", const="justslide")
    a = ap.parse_args()
    for n in (a.until, a.only, a.redo):
        if n and n not in STEPS:
            print(f"unknown step {n}; steps: {', '.join(STEPS)}")
            return 2
    ENGINE_ROOT.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(exist_ok=True)
    EVID.mkdir(exist_ok=True)
    st = load_state()
    if a.status:
        print(json.dumps(status_report(st), indent=2))
        return 0
    if a.errors:
        print(first_errors(LOG_DIR / f"build_{a.errors}.log"))
        return 0
    if a.redo:
        for s in STEPS[STEPS.index(a.redo):]:
            st["steps"].pop(s, None)
        save_state(st)
        say(f"reset {a.redo} and later steps")
    b = Budget(a.budget_min)
    todo = [a.only] if a.only else STEPS[: STEPS.index(a.until) + 1 if a.until else len(STEPS)]
    say(f"engine root {ENGINE_ROOT}; pin {PIN_TAG}; budget {a.budget_min:.0f} min; free {free_gb(ENGINE_ROOT)} GB")
    rc = 0
    for s in todo:
        e = st["steps"].get(s, {})
        if e.get("state") == "done" and not a.only:
            continue
        if b.left() < 60:
            rc = 10
            break
        say(f"== step {s}")
        st["steps"][s] = {**e, "state": "running", "updated": now(), "runs": e.get("runs", 0) + 1}
        save_state(st)
        try:
            res = STEP_FUNCS[s](b, st)
            st["steps"][s].update(state="done", updated=now(), result=res)
            save_state(st)
            say(f"   {s}: done")
        except OutOfTime:
            st["steps"][s].update(state="in_progress", updated=now())
            save_state(st)
            rc = 10
            break
        except StepFailed as ex:
            st["steps"][s].update(state="failed", updated=now(), error=str(ex))
            save_state(st)
            say(f"   {s}: FAILED: {ex}")
            if s.startswith("build_"):
                print("---- first errors ----")
                print(first_errors(LOG_DIR / f"{s}.log"))
            rc = 1
            break
    print("---- status ----")
    print(json.dumps(status_report(st), indent=2))
    if rc == 10:
        say("RESULT: incomplete - budget spent, no failure. Run the same command again to continue.")
        return 0  # progress without failure; --status tells whether everything is done
    say("RESULT: " + ("all requested steps done" if rc == 0 else "FAILED"))
    return rc


if __name__ == "__main__":
    sys.exit(main())
