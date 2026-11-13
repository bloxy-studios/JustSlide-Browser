# Chromium integration

## Pin
`chromium.lock.json`: **157.0.8103.51**, commit `653674df293788cf4932c40d914e9e15b41a2d31` (Mac Stable, fully rolled out 2026-11-09). Mac SDK official 27.0, deployment target 13.0 (`build/config/mac/mac_sdk.gni`).

## Checkout layout
Product repo stays small. The engine lives **outside** it: `$JUSTSLIDE_ENGINE_ROOT` (default `~/justslide-engine/{depot_tools,chromium/src}`). `apply-patches.sh` rsyncs product sources into `src/justslide/` (added to `src/.git/info/exclude`) and applies `patches/chromium/series` (ADR 0001). No submodule, no nested repo, no upstream objects in this repo.

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
| 0001 branding + profile dir | `chrome/app/theme/chromium/BRANDING`, `chrome/app/app-Info.plist` | Bundle id `app.justslide.JustSlide.dev`, product name, `CrProductDirName=JustSlide Dev` |
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
5. `--load-extension` availability in unbranded 157 builds (else use developer-mode “Load unpacked” in the fixture test).

## Baseline-first rule
Build `baseline` from an unpatched checkout and record its result before applying the series; `gn-gen.sh baseline` refuses a patched tree.
