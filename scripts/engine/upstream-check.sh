#!/usr/bin/env bash
# Compare the lock with current official Mac Stable data. Never edits the lock;
# --propose writes docs/evidence/upstream-proposal.json for human review.
source "$(dirname "$0")/../lib.sh"
python3 - "$PIN_TAG" "${1:-}" "$JS_ROOT" <<'PY'
import json, sys, urllib.request
pin, mode, root = sys.argv[1:]
get = lambda u: json.load(urllib.request.urlopen(u, timeout=30))
rel = get('https://versionhistory.googleapis.com/v1/chrome/platforms/mac/channels/stable/versions/all/releases?filter=endtime=none')['releases']
full = sorted({r['version'] for r in rel if r.get('fraction', 0) >= 1}, key=lambda v: [int(x) for x in v.split('.')])
dash = {r['version']: r for r in get('https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Mac&num=20')}
cand = full[-1] if full else None
print(f'pinned: {pin}\nfully-rolled-out Mac Stable: {full}\ncandidate: {cand} ({dash.get(cand, {}).get("hashes", {}).get("chromium", "?")})')
if cand and cand != pin:
    print('UPDATE AVAILABLE — follow docs/upstream-maintenance.md (security intake, rebase, baseline build, full test suite).')
    if mode == '--propose':
        json.dump({'from': pin, 'to': cand, 'commit': dash.get(cand, {}).get('hashes', {}).get('chromium'), 'status': 'proposed, unreviewed'}, open(f'{root}/docs/evidence/upstream-proposal.json', 'w'), indent=2)
        print('wrote docs/evidence/upstream-proposal.json')
else:
    print('lock matches the newest fully rolled-out Mac Stable.')
PY
