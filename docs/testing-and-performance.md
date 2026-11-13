# Testing & performance

## Evidence tiers
1. **Unit/component** (jsdom, cargo) — logic only.
2. **Preview** — production WebUI bundle in Chrome for Testing 157.0.8103.50 headless shell (same milestone as the pin) under the real WebUI CSP/TT. Not JustSlide.
3. **Native** — the built JustSlide binary (browser_tests, interactive_ui_tests, manual demo). **None yet.**

## Current results (2026-11-11, Linux x86_64 sandbox)
| Suite | Result |
|---|---|
| `bun run test:ui` (vitest) | 4 files, 18 tests passed |
| `bun run typecheck` | pass |
| `bun run build:ui` + bundle audit | pass (27 files, no inline scripts/eval/preview code; reviewed remote host literals) |
| `tests/visual/webui-csp.ts` | pass: 0 console errors, 0 CSP/TT violations, 0 egress, Mojo intent fired; light/dark |
| `tests/visual/preview-layout.ts` | screenshots 1440×1024, 1100×720 (dark, custom backdrop, collapsed), gallery |
| `cargo test` (mcp) | 10 passed |
| `engine:verify-patches` | 3/3 apply + idempotent |
| C++ unit/browser tests | **not run** (not built) |
Logs: `docs/evidence/` (`check.log`, `patch-verify.txt`, `environment.txt`, `visual/webui-csp-report.json`). PNG screenshots are regenerated locally, not committed.

## Native plan
* `//justslide/test:unit_tests` (GrantStore), `:browser_tests` (BackgroundTabDoesNotActivate, CaptureHiddenTab, SidebarUrlInTabIsInert, WebPageCannotBindShellInterface) — run with `out/dev-<cpu>/browser_tests --gtest_filter='JustSlide*'`.
* interactive_ui_tests: focus/F6 traversal, IME in address field, menu over content boundary, shortcut priority (Cmd+L/T/W vs page), full screen.
* Required E2E demo (README §acceptance) scripted with the fixture server + `justslide-mcp` probe.
* Failure cases: renderer crash, failed navigation, modal interruption, downloads, expired grant, competing agents, session restore, patch reapplication.

## Performance (not measured yet)
Measure on named hardware vs the **unmodified baseline**: aggregate browser+renderer+GPU+network memory (idle, 10/50 tabs), idle CPU, cold/warm startup, tab switch latency, agent burst (30 tabs/min cap), sidebar snapshot cost. Bound: debounce 16 ms, ≤8 concurrent requests/connection, ≤1024 queued events. No claims until measured.
