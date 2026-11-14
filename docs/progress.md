# Progress

## Session 2 — 2026-11-13 (repository `bloxy-studios/JustSlide-Browser`)

### Environment actually used
* **Authoring sandbox:** Linux x86_64, 2 vCPU, 4 GB RAM, ~28 GB free, Bun 1.4.4, Node 24, Python 3.9,
  Rust (no C linker, so `cargo test` cannot link here). Chrome for Testing **157.0.8103.51**
  headless shell for preview checks.
* **Build Mac (via SimBridge MCP, no shell, ≤60 min per job):** Intel x64, macOS 26.5.1, Xcode 26.6
  (17F113), 69.1 GB free. RAM and core count are recorded by the pipeline's `doctor` step on first run.
  The pin explicitly supports Xcode 26.6/SDK 26.5 on Intel hosts.
* **Mac projects:** `JustSlide-Browser` cloned to `~/SimBridge/Projects/JustSlide-Browser`
  (SimBridge project `myPw4sreOoasxHnsEcmwJw`), approved + trusted 2026-11-13 14:36 UTC; first
  `engine:step` job started 14:42 UTC. The existing
  `~/Developer/JustSlide` project is the separate WebKit build and is not touched.
* **Figma:** Composio MCP, account `figma_pop-chasse`, file `nw47hqMLTtmBMksJ4BnJKb` (see `docs/figma-integration.md`).

### Done this session
1. Restored the session-1 foundation (bundle `32ddddc`, 168 files) into this repo. GitHub writes
   work through the GitHub MCP, except files under `.github/workflows/` (403 without the workflows
   permission). The CI workflow is therefore at `docs/ci/github-actions-ci.yml`; move it into
   `.github/workflows/` yourself.
2. Read the Figma design via Composio: 6 frames, the `Slide / Tab` component set and `Slide / Tooltip`,
   26 colour variables across 3 modes, 83 icon layers as SVG. Committed: `design/figma/snapshot.json`,
   `design/figma/renders/*.b64`, `design/tokens.json`.
3. **Replaced ADS** with a Figma-derived design system (React 19 + CSS Modules): generated tokens,
   SVG-element icons, `IconButton`/`Tooltip`/`Menu`/`Dialog`, and the sidebar rebuilt node by node
   (`DESIGN.md`). The WebUI no longer needs any Trusted Types policy; the C++ data source now
   sends `trusted-types;`.
4. Icons: 10 Nucleo glyphs from the design's own layers (licence: ≤100 in public source, enforced),
   14 theSVG marks vendored from `@thesvg/icons@4.0.9` with integrity and per-mark licence.
5. Contract additions across mojom/C++/TS: `StopLoading()`, `ShowDownloads()` (IDC_SHOW_DOWNLOADS),
   `WorkspaceIcon::kCodex`; seed workspaces in Figma dock order (Personal, Codex, Claude Code, ChatGPT).
6. **Identity collision fixed:** the WebKit build uses `~/Library/Application Support/JustSlide Dev`.
   The Chromium build is now `JustSlide Chromium Dev`, bundle id `app.justslide.chromium.dev`,
   Keychain service `app.justslide.chromium.dev.pairing`. Patch series re-verified.
7. **Engine pipeline** `scripts/engine/pipeline.py`: resumable, time-boxed steps for the SimBridge
   60-minute job limit (`docs/chromium-integration.md`). Budget stop and resume tested locally; doctor fails
   correctly on Linux.

### Owner design decisions applied (2026-11-13, later the same day)
Mint only (dark/light themes removed); shadows replace all strokes/borders (focus = glow);
customisable backdrop incl. frosted **glass** (`glass`, `glass:#hex`; WebUI + pref validation done,
native vibrancy pending, see chromium-integration Open Q6); **no preset favorites**: drag a tab
or link onto the row to add (`AddFavoriteFromTab`, `AddFavoriteFromUrl` with drop index; http/https
only, sizes bounded in C++), drag tiles to reorder (MoveFavorite now accepts any delta); Gmail 2026
mark. Sidebar + window background are one colour layer (sidebar transparent; native host 252 dip, rail 44), frame padding and gap 6 px. UI tests 33/33; Figma comparison now mint frames only.

### UI/UX audit for a native Mac feel (2026-11-13, later)
See `docs/ux-audit.md`. Measured findings went from 74 to 0 on every fixture (contrast, sizes under 11 px, targets,
cursors). Native context menus (`ShowContextMenu` → `SidebarContextMenu` → NSMenu), window-active state
(`window_active`), native help tags, list keyboard navigation, macOS text styles, a traffic-light slot,
Windows platform styles. UI tests 38/38.

### Build Mac facts (from the pipeline's doctor step, 2026-11-13)
MacBookPro16,2, Intel Core i5-7300U, **4 logical cores, 8 GB RAM**, macOS 26.5.1, Xcode 26.6 (SDK 26.5), APFS,
76 GB free before fetch. The pipeline now uses `-j3` and `concurrent_links=1` for 8 GB. Expect the first full
Chromium build to take **a day or more** of 52-minute runs on this machine. Run 1: doctor, depot_tools,
shallow `src` at the tag (37 min fetch) done; `gclient sync` started.

### Build run 3 (2026-11-13 12:52–13:20 local)
`gclient sync`, hooks and `gn gen` done (37,024 targets; 86.6 GB free after cleanup). The baseline
compile started (778 / ~87,000 steps in 7.5 min at -j3) and then failed: Xcode 26 doesn't include the
**Metal Toolchain** that ANGLE's Metal shaders need. The pipeline now runs
`xcodebuild -downloadComponent MetalToolchain` before building if `xcrun metal` is missing.

### Verified (with what)
| Check | Result | Where |
|---|---|---|
| UI tests (jsdom) | **38/38 pass** | `bun run test:ui` |
| UX audit (contrast, type scale, targets, cursor) | **0 findings** (was 74) | `tests/visual/ux-audit.ts` |
| Typecheck | pass | `bun run typecheck` |
| WebUI production build + audit (no inline script, eval, preview code, TT policy, remote hosts; no HTML sinks in product source) | pass, 4 files, ~293 KB | `bun run build:ui` |
| Sidebar under Chromium 157 WebUI CSP (`trusted-types;` with zero policies, `connect-src 'none'`) | 0 errors, 0 violations, 0 egress, correct mint/dark token values | `docs/evidence/visual/webui-csp-report.json` |
| Preview vs Figma, sidebar column | 7.7–8.2 % pixels differ. Causes: Noto Sans vs SF Pro on Linux, letter-tile favicons in preview, Gmail mark version | `docs/evidence/visual/figma-compare*.{json,png}` |
| Patch series vs pristine 157.0.8103.51 | applies; re-application no-op | `bun run engine:verify-patches` |
| Bugs found by these checks and fixed | mint tokens overridden by `:root` light rule; theSVG marks lost root fill (blank); stretched Netflix mark; stale hashed bundles in dist; menu focus lost after pin | |

### Not done / not verified
* **No Chromium checkout or build yet**, so no binary, launch, native screenshots, extension run or
  MCP-vs-browser test. The C++ integration is still uncompiled.
* MCP bridge tests not re-run this session (no C linker in the sandbox). Next: `project_cargo test` on the Mac.
* Sidebar host layout slot (Open Q1), pairing dialog, socket connection loop and pending-request
  plumbing: unchanged from session 1.

## Resume (exact)
On SimBridge (after approval; project `myPw4sreOoasxHnsEcmwJw`):
```
project_run_script { projectId, script: "engine:step", timeoutMinutes: 60 }   # repeat; each run ≤52 min of work
project_run_script { projectId, script: "engine:status" }
project_run_script { projectId, script: "engine:errors" }                        # after a failed build
project_cargo      { projectId, action: "test", cwd: "mcp" }
```
On a Mac shell instead: `bun install && bun run engine:step` (repeat), then `bun run engine:status`.
After `verify_baseline`: the pipeline patches, stages the UI and builds JustSlide in the same out
dir. To pick up pushed C++ fixes, run `bun run engine:step --only build_justslide`. The built app is
`.engine/chromium/src/out/JustSlide/*.app`; launch it with SimBridge `desktop_app_launch` for native screenshots.

## Next prioritised tasks
1. Owner: approve + trust `JustSlide-Browser` on the SimBridge dashboard; confirm the Nucleo licence holder.
2. Run `engine:step` until `verify_baseline` is done; record build time and size.
3. Compile `src/justslide`, fix errors, decide the sidebar host slot, then native Figma comparison.
4. Real MV3 fixture, focus-preserving agent demo, socket loop + pairing dialog.

---

## Session 1 — 2026-11-11 (summary)
Linux sandbox only (2 vCPU/4 GB/24 GB): pin, patch series, C++ integration (uncompiled), ADS
sidebar (since replaced), protocol registry + codegen, `justslide-mcp` with 10 tests against a
browser test double, scripts and docs. Native build blocked on hardware; Figma unreachable then.
