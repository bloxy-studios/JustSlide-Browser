#!/usr/bin/env python3
"""Verify the patch series against pristine pinned upstream files fetched from
Gitiles (no checkout needed). Checks: every patch applies in order, and the
series is a no-op on re-application (reverse-check passes). Used in fast CI.
"""
import base64, json, os, re, subprocess, sys, tempfile, urllib.request, time
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
lock = json.load(open(os.path.join(ROOT, 'chromium.lock.json')))
commit = lock['upstream']['commit']
series = [l.strip() for l in open(os.path.join(ROOT, 'patches/chromium/series')) if l.strip() and not l.startswith('#')]
patches = [os.path.join(ROOT, 'patches/chromium', p) for p in series]
files = sorted({m for p in patches for m in re.findall(r'^\+\+\+ b/(\S+)', open(p).read(), re.M)})
def fetch(path):
    url = f'https://chromium.googlesource.com/chromium/src/+/{commit}/{path}?format=TEXT'
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=60) as r: return base64.b64decode(r.read())
        except Exception as e:
            if attempt == 4: raise
            time.sleep(2 ** attempt)
with tempfile.TemporaryDirectory() as d:
    run = lambda *a: subprocess.run(['git', *a], cwd=d, capture_output=True, text=True)
    run('init', '-q')
    for f in files:
        os.makedirs(os.path.join(d, os.path.dirname(f)), exist_ok=True)
        open(os.path.join(d, f), 'wb').write(fetch(f))
    print(f'fetched {len(files)} pristine files @ {commit[:12]}')
    for p in patches:
        r = run('apply', '--check', p)
        if r.returncode: print(f'FAIL apply {os.path.basename(p)}:\n{r.stderr}'); sys.exit(1)
        run('apply', p); print(f'ok   apply {os.path.basename(p)}')
    for p in reversed(patches):
        r = run('apply', '--reverse', '--check', p)
        if r.returncode: print(f'FAIL idempotency {os.path.basename(p)}:\n{r.stderr}'); sys.exit(1)
    print('ok   re-application detected as no-op (reverse-check) for whole series')
