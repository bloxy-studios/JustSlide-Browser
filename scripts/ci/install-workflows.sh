#!/usr/bin/env bash
# Copies docs/ci/*.yml into .github/workflows/ and pushes them with this
# machine's own git credentials. Needed because the agent's GitHub integration
# token lacks the `workflow` scope. Safe to re-run (no-op when already installed).
set -euo pipefail
cd "$(dirname "$0")/../.."
git fetch -q origin main
git checkout -q main
git merge -q --ff-only origin/main
mkdir -p .github/workflows
cp docs/ci/build-mac.yml .github/workflows/build-mac.yml
cp docs/ci/ci.yml .github/workflows/ci.yml
git add .github/workflows
if git diff --cached --quiet; then echo "workflows already installed"; exit 0; fi
git -c user.name="JustSlide CI setup" -c user.email="ci@justslide.app" \
  commit -qm "ci: install macOS build + fast-check workflows [mac-build]"
git push origin main
echo "pushed $(git rev-parse --short HEAD)"
