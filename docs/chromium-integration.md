# Chromium integration

## Pin
`chromium.lock.json`: **157.0.8103.51**, commit `653674df293788cf4932c40d914e9e15b41a2d31` (Mac Stable, fully rolled out 2026-11-09). Deployment target 13.0; `mac_sdk_min` 15. Official builds use SDK 27.0, but the pin explicitly supports **universal Xcode 26.6 + SDK 26.5 on Intel hosts** ("Xcode 27+ is ARM-only", `build/config/mac/mac_sdk.gni`). Non-official builds with system Xcode use whatever SDK ≥ 15 Xcode provides. The owner's Mac (Intel, Xcode 26.6) qualifies.

## Checkout layout
Product repo stays small. The engine lives in **`<repo>/.engine/`** (git-ignored, never tracked; override with `JUSTSLIDE_ENGINE_ROOT`): `depot_tools/`, `chromium/{.gclient,src}`, `logs/`, `evidence/`, `state.json`. It sits inside the project folder so that SimBridge (which only launches apps inside an approved project) can run and screenshot the built `.app`. `apply-patches.sh` rsyncs product sources into `src/justslide/` (added to `src/.git/info/exclude`) and applies `patches/chromium/series` (ADR 0001). No submodule, no upstream objects in git. **`git clean -fdx` would delete the checkout; don't.**

## Engine pipeline (`scripts/engine/pipeline.py`, `bun run engine:step`)
A resumable state machine, because remote build jobs on the Mac are capped at 60 minutes and have no shell. Each run resumes at the first unfinished step, works until its budget (default 52 min) is spent, stops ninja/gclient with SIGINT so they resume cleanly, and prints a status report. Re-run until `bun run engine:status` shows every step `done`.

| Step | Does |
|---|---|
| `doctor` | host, Xcode, SDK, RAM, disk (≥45 GB free before sync), writes `evidence/doctor.json` |
| `depot_tools` | shallow clone + bootstrap |
| `src_checkout` | writes `.gclient` (unmanaged `src`), `git fetch --depth=1` of **only** `refs/tags/<pin>`, verifies the commit |
| `gclient_sync` | `gclient sync --nohooks --no-history --shallow -D --revision src@<commit>`; removes interrupted `_bad_scm` leftovers |
| `runhooks` | toolchains (clang, rust, node, …) |
| `gn_baseline` / `build_baseline` | `out/JustSlide`, unpatched; refuses a patched tree |
| `verify_baseline` | `--version`, headless `--dump-dom` + `--screenshot` of a local fixture; `evidence/baseline.json` |
| `ui_install`, `patch`, `stage_ui` | `bun install --frozen-lockfile`; patch series; production WebUI → `src/justslide/resources/webui_dist` |
| `gn_justslide` / `build_justslide` | same out dir, incremental rebuild (re-syncs product sources each run, so pushed fixes are picked up) |
| `verify_justslide` | as baseline + bundle id must be `app.justslide.*` |

GN args (lean for ~70 GB free, Intel): `is_debug=false is_component_build=true symbol_level=0 blink_symbol_level=0 v8_symbol_level=0 dcheck_always_on=true proprietary_codecs=false ffmpeg_branding="Chromium" enable_widevine=false use_official_google_api_keys=false chrome_pgo_phase=0`. `-j` = min(cores, RAM/1.5 GB). `bun run engine:errors` prints the first compile errors of the last build.

## Source map
| Repo | Checkout | GN |
|---|---|---|
| `browser/integration/justslide/common` | `src/justslide/common` | `//justslide/common` |
| `browser/integration/justslide/webui` | `src/justslide/webui` | `//justslide/webui`, `:mojo_bindings` |
| `browser/integration/justslide/browser` | `src/justslide/browser` | `//justslide/browser` |
| `browser/integration/justslide/automation` | `src/justslide/automation` | `//justslide/automation` |
| `browser/integration/justslide/ui` | `src/justslide/ui` | `//justslide/ui` |
| `browser/resources` + staged `ui/browser-chrome/dist/webui` | `src/justslide/resources{,/webui_dist}` | `//justslide/resources` (GRIT pak) |
| `tests/fixtures/pages` | `src/justslide/test/data` | used by `//justslide/test:browser_tests` |

## Patch series (v1)
| Patch | Touches | Why |
|---|---|---|
| 0001 branding + profile dir | `chrome/app/theme/chromium/BRANDING`, `chrome/app/app-Info.plist` | Bundle id `app.justslide.chromium.dev`, product name, `CrProductDirName=JustSlide Chromium Dev` |
| 0002 build + registration | `chrome/browser/BUILD.gn`, `ui/webui/BUILD.gn`, `chrome_web_ui_configs.cc`, `chrome_browser_interface_binders_webui_parts_desktop.cc`, `chrome/chrome_paks.gni`, `chrome/test/BUILD.gn`, `profiles/BUILD.gn`, `chrome_browser_main_extra_parts_profiles.cc` | Register WebUI config, Mojo broker (`ForWebUI<JustSlideSidebarUI>`), pak, keyed service, session persistence, tests |
| 0003 sidebar host hook | `ui/views/frame/BUILD.gn`, `browser_view.cc` | Attach `JustSlideSidebarHost` after `VerticalTabStripRegionView` creation |
Verified: `python3 scripts/engine/verify_patches_remote.py` → all apply to pristine pinned blobs; reverse-check proves re-application is a no-op (evidence: `evidence/patch-verify.txt`).

## Verified upstream symbols (Gitiles @ pin)
`TopChromeWebUIConfig`/`DefaultTopChromeWebUIConfig<T>` (top_chrome_webui_config.h), `TopChromeWebUIController`, `content::WebUIConfigMap::AddWebUIConfig`, `WebUIBrowserInterfaceBrokerRegistry::ForWebUI<T>().Add<I>()`, `webui::SetupWebUIDataSource`, `WebUIDataSource::OverrideContentSecurityPolicy`, default WebUI CSP (`content/public/browser/url_data_source.cc`), `Navigate(NavigateParams*)` + `WindowOpenDisposition::NEW_BACKGROUND_TAB` + `AddTabTypes::{ADD_NONE,ADD_PINNED}` + `WindowAction::kNoAction`, `TabStripModel::{count,GetWebContentsAt,ActivateTabAt,SetTabPinned,CloseWebContentsAt,MoveWebContentsAt,IsTabPinned,GetTabAtIndex}`, `TabCloseTypes::CLOSE_USER_GESTURE|CLOSE_CREATE_HISTORICAL_TAB`, `tabs::TabInterface` (components/tabs/public), `BrowserWindowInterface::{GetProfile,GetTabStripModel,GetFeatures}`, `WebContents::IncrementCapturerCount(size, stay_hidden, stay_awake, is_activity)`, `WebContents::RequestAXTreeSnapshot(cb, mode, max_nodes, timeout, policy)`, `ContentSerializedNavigationDriver::RegisterExtendedInfoHandler`, `sessions::ExtendedInfoHandler`, `BookmarkModel::{AddFolder,AddURL,Remove(node, source, location),Move}`, `net::UnixDomainServerSocket(AuthCallback, bool)` + `Credentials::user_id`, `AutocompleteClassifier::Classify`, `VerticalTabStripRegionView` (views/frame), mojom TS generator target `*_ts__generator`, `ts_library.gni`.
Upstream `TabStripService.CreateTabAt` (components/browser_apis/tab_strip) **always activates** → not used for agents.

## Open native questions (resolve in milestone C spike)
1. **Sidebar host layout**: `VerticalTabStripRegionView` lays out via `CalculateProposedLayout` over known children; an extra child is not positioned. Options: (a) a small 0004 patch adding a "custom content" slot to the region's layout delegate; (b) a dedicated leading-edge view in `BrowserViewLayout`. Decide with interactive_ui_tests (focus traversal F6, resize, collapse, RTL).
2. `JustSlideSidebarUI::SetOwningWindow` timing vs `CreatePageHandler` (WebUI created on first navigation commit) — may need `WebUIControllerFactory` hook or passing the window via `WebContentsUserData` before `LoadInitialURL`.
3. `//justslide/resources` mojo grdp wiring: the generated `.mojom-webui.ts` must be compiled with `ts_library` before GRIT; target names to confirm on first gn gen.
4. Agent profile window creation without activation (`Browser::CreateParams` + `ShowInactive`).
7. **Window layout and single backdrop layer** (owner decision): the browser window background paints the backdrop colour once; the sidebar WebUI view (252 dip, `JustSlideSidebarHost::kExpandedWidthDip`) is transparent; the page view is inset 6 dip (`kFramePaddingDip`) from the top/right/bottom edges with radius 16 and a shadow, and no 1 px border.
6. **Frosted glass backdrop** (owner decision 2026-11-13): when the backdrop pref is `glass`/`glass:#hex`, the browser window needs native vibrancy (an `NSVisualEffectView` behind the frame, or Chromium's macOS window background-material support if available at the pin) and the sidebar WebUI's `WebContents` must use a transparent base background (`SetPageBaseBackgroundColor(SK_ColorTRANSPARENT)`) so the translucent tint shows. The page window keeps an opaque surface and a shadow (no 1 px stroke). Not implemented natively yet; the WebUI side and pref validation are done.
5. `--load-extension` availability in unbranded 157 builds (else use developer-mode “Load unpacked” in the fixture test).

## Baseline-first rule
Build the baseline from an unpatched checkout and record its evidence before applying the series; `gn_baseline`/`build_baseline` refuse a patched tree. The JustSlide build then reuses the same out dir (disk budget), so the baseline binary is overwritten after its evidence (version, sha256, screenshot) is recorded.
