# Plan (dependency-ordered)

**A. Foundation** — inspect env/repo · pin from official data · verify symbols · docs/rules/ignore/MCP config · doctor · protocol registry + codegen · UI toolchain + ADS · MCP bridge · patch series + remote verification · fixtures. **(done this session; see progress.md)**

**B. Baseline engine** — on a qualifying Mac: `doctor:engine` → `engine:fetch --yes` → `engine:gn baseline` → `build:browser baseline chrome` → launch with disposable profile → record build time, binary size, idle memory as baseline.

**C. Native spike** — apply series → stage UI → `dev` build → fix compile errors in `src/justslide` → sidebar host layout decision (0004 patch if needed) → verify: two real tabs reflected; switching keeps keyboard/IME/a11y; menu/prompt over the content boundary via Views; inactive agent tab; hidden-tab capture; MV3 fixture; rebuild from bundled production resources. Browser tests green.

**D. Shell & persistence** — tab create/select/close/reopen/pin/move, workspaces create/rename/select, favorites add/remove/reorder, loading/error, restart restoration & id reconciliation; native menus/shortcuts parity; 1440×1024 / 1100×720 / collapse / dark / backdrop.

**E. Automation** — AutomationServer connection loop (hello/welcome, frames, semaphore, cancel), agent profile window (inactive), grants + pairing dialog + Keychain, pending requests, pause/revoke UI wiring, events/resync, hostile-page and competing-agent tests, E2E demo.

**F. Hardening** — extension manager + compatibility matrix, interaction polish, performance vs baseline, packaging per CPU, signing plan (approval), update strategy, upstream rebase drill from clean checkout.
