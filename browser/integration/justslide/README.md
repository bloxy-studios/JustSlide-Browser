# browser/integration/justslide → `src/justslide/` in the Chromium checkout

Product-owned C++/Mojo/GN sources. `scripts/engine/apply-patches.sh` copies
this directory to `$CHROMIUM_SRC/justslide/` (GN labels `//justslide/...`) and
applies `patches/chromium/series` to hook it into `//chrome`.

**Status: authored against Chromium 157.0.8103.51 headers (symbols verified
with Gitiles, see docs/chromium-integration.md), NOT yet compiled.** Expect
compile fixes on the first native build; record them in docs/progress.md.

| Dir | GN target | Purpose |
|---|---|---|
| `common/` | `//justslide/common` | Names, hosts, pref keys, features |
| `webui/` | `//justslide/webui`, `:mojo_bindings` | `chrome://justslide-sidebar.top-chrome` controller + PageHandler |
| `browser/` | `//justslide/browser` | Workspace service, durable tab identity, background tab ops |
| `automation/` | `//justslide/automation` | Authenticated local socket, grants, command dispatcher |
| `test/` | `//justslide/test:*` | unit + browser tests (added to `unit_tests`/`browser_tests` by patch 0002) |
