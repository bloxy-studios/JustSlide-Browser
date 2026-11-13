#!/usr/bin/env bash
# Copy product-owned sources into src/justslide and apply patches/chromium/series.
# Safe to re-run: already-applied patches are detected (reverse --check) and skipped;
# a patch that neither applies nor is applied fails with a diagnostic. No --force.
source "$(dirname "$0")/../lib.sh"
SRC="${1:-$CR_SRC}"
[[ -d "$SRC/.git" ]] || die "no Chromium checkout at $SRC (run scripts/engine/fetch.sh --yes)"
head="$(git -C "$SRC" rev-parse HEAD)"; [[ "$head" == "$PIN_COMMIT" ]] || die "checkout HEAD $head != pinned $PIN_COMMIT"
info "syncing product sources -> $SRC/justslide"
mkdir -p "$SRC/justslide"
rsync -a --delete --exclude resources/webui_dist "$JS_ROOT/browser/integration/justslide/" "$SRC/justslide/"
mkdir -p "$SRC/justslide/resources" "$SRC/justslide/test/data"
rsync -a --exclude webui_dist "$JS_ROOT/browser/resources/" "$SRC/justslide/resources/"
rsync -a "$JS_ROOT/tests/fixtures/pages/" "$SRC/justslide/test/data/"
grep -qxF 'justslide/' "$SRC/.git/info/exclude" 2>/dev/null || echo 'justslide/' >> "$SRC/.git/info/exclude"
while read -r p; do
  [[ -z "$p" || "$p" == \#* ]] && continue
  f="$JS_ROOT/patches/chromium/$p"
  if git -C "$SRC" apply --reverse --check "$f" 2>/dev/null; then info "already applied: $p"
  elif git -C "$SRC" apply --check "$f" 2>/tmp/justslide-patch.err; then git -C "$SRC" apply "$f"; info "applied: $p"
  else cat /tmp/justslide-patch.err >&2; die "patch $p does not apply to $PIN_TAG. Rebase it (docs/upstream-maintenance.md); do not force."; fi
done < "$JS_ROOT/patches/chromium/series"
info "patch series ok"
