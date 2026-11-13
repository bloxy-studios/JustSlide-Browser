#!/usr/bin/env bash
# Fetch/sync the pinned Chromium revision OUTSIDE the product repo.
# Idempotent and resumable: re-run after interruption. Large download (~30 GB
# objects, ~60 GB after hooks); requires --yes.
source "$(dirname "$0")/../lib.sh"
[[ "${1:-}" == --yes ]] || { info "Will create/sync $ENGINE_ROOT/chromium at $PIN_TAG ($PIN_COMMIT)."; info "Needs >=120 GB free, APFS (macOS), several hours. Re-run with --yes to proceed."; exit 2; }
"$JS_ROOT/scripts/doctor.sh" --engine || die "doctor --engine reported blockers (see above)"
need git "https://git-scm.com"; need python3 "python.org or Xcode CLT"
mkdir -p "$ENGINE_ROOT"
if [[ ! -x "$DEPOT_TOOLS/gclient" ]]; then
  info "cloning depot_tools -> $DEPOT_TOOLS"
  git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git "$DEPOT_TOOLS"
fi
export PATH="$PATH:$DEPOT_TOOLS" DEPOT_TOOLS_UPDATE="${DEPOT_TOOLS_UPDATE:-1}"
mkdir -p "$ENGINE_ROOT/chromium"; cd "$ENGINE_ROOT/chromium"
if [[ ! -f .gclient ]]; then
  info "fetch --nohooks --no-history chromium (first run only)"
  fetch --nohooks --no-history chromium
fi
cd src
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  die "chromium/src has local modifications; refusing to change revision. Inspect with 'git -C $CR_SRC status' (JustSlide never resets your changes)."
fi
info "checking out $PIN_TAG"
git fetch --depth=1 origin "refs/tags/$PIN_TAG:refs/tags/$PIN_TAG"
git checkout --detach "$PIN_TAG"
[[ "$(git rev-parse HEAD)" == "$PIN_COMMIT" ]] || die "tag $PIN_TAG resolved to $(git rev-parse HEAD), lock says $PIN_COMMIT"
info "gclient sync (DEPS of the pinned commit)"
gclient sync --revision "src@$PIN_COMMIT" --no-history -D --nohooks
gclient runhooks
info "done: $CR_SRC at $PIN_TAG. Next: scripts/engine/gn-gen.sh baseline && scripts/engine/build.sh baseline"
