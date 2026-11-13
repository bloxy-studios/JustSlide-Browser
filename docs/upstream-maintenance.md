# Upstream maintenance

* **Intake**: watch Chrome Releases + `bun run upstream:check` (Mac Stable fully rolled out). Security-only stable updates within a milestone: target ≤ 7 days.
* **Procedure**: `upstream:check --propose` → review notes/CVEs → new branch → update lock (tag+commit) → `engine:fetch --yes` → build **baseline** → apply series (`engine:patch`); on failure rebase each patch in the checkout (`git am -3` style), regenerate with `git format-patch`, update headers → `engine:verify-patches` → build dev/release both CPUs → unit/browser/interactive tests + E2E demo → package with provenance → human review.
* **Never** auto-advance the lock, force patches or clean a dirty checkout.
* **Footprint budget**: keep upstream-touching lines small (v1: 35). Prefer `src/justslide/` additions.
* **Regression suite**: JustSlide browser_tests, grant unit tests, MCP protocol tests, WebUI CSP/TT check, patch verification.
* **Owners**: integration owner (patch series), security reviewer (Mojo/automation), UI owner (ADS upgrades + glyph/remote-host audits).
