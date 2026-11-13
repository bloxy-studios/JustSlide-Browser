# Architecture

## Processes & trust boundaries
```
┌──────────────────────────── Browser process (trusted, C++) ───────────────────────────┐
│ Chromium //chrome: TabStripModel, NavigationController, Profiles, Extensions,         │
│ Bookmarks, Downloads, Permissions, SessionService                                      │
│ JustSlide (src/justslide):                                                             │
│   WorkspaceService (KeyedService, prefs) · TabIdentity (WebContentsUserData +          │
│   NavigationEntry extended info) · BackgroundTabOps · JustSlidePageHandler (Mojo)      │
│   AutomationServer (IO thread, AF_UNIX) → CommandDispatcher (UI thread) · GrantStore   │
└───────▲ Mojo (justslide.mojom.PageHandler, ForWebUI<JustSlideSidebarUI> only) ─────────┘
        │                                   ▲ u32-framed JSON over AF_UNIX (peer uid + token)
┌───────┴──────────────┐   ┌──────────────┐ │   ┌──────────────────────┐   ┌─────────────┐
│ Sidebar renderer     │   │ Page         │ └───│ justslide-mcp (Rust) │◄──│ MCP client  │
│ chrome://justslide-  │   │ renderers    │     │ stdio transport only │   │ (Cursor…)   │
│ sidebar.top-chrome   │   │ (site-       │     └──────────────────────┘   └─────────────┘
│ React+ADS, CSP+TT    │   │  isolated)   │
└──────────────────────┘   └──────────────┘
```
* Sidebar = trusted WebUI in its own WebContents hosted by `JustSlideSidebarHost` (views::WebView) in the leading-edge region of `BrowserView`. It is not in `TabStripModel` → invisible to `chrome.tabs`, never gets content scripts.
* Page viewport = ordinary Chromium WebContents; native layout keeps it separate. Overlapping UI (menus, prompts) = Views bubbles, never DOM z-index.
* External agents reach the browser only through the bounded local protocol (`protocol/registry`), never raw Mojo/CDP.

## Ownership
| State | Owner | Persistence |
|---|---|---|
| Tabs, order, pinning, navigation, history | Chromium | session restore / history DB |
| Durable tab id + workspace id | TabIdentity | NavigationEntry extended info (session restore) |
| Workspaces, selection, color mode, backdrop, collapsed | WorkspaceService | profile prefs (`justslide.*`, schema v1) |
| Favorites | BookmarkModel folder "JustSlide Favorites" | bookmarks file |
| Grants (token hashes, scopes, paused/revoked) | GrantStore | profile prefs; token only in Keychain |
| Endpoint discovery | AutomationServer | `JustSlideAutomation/endpoint.json` (0600) |

## Threading
UI thread: Mojo handlers, TabStripModel, dispatcher. Dedicated IO thread (`MessagePumpType::IO`): socket accept/read/write; hops to UI via PostTask. Capture/AX snapshot complete asynchronously; results are bounded.

## Profiles vs workspaces
Workspace = organisation inside one profile (shared cookies/extensions). Agent workspaces default to a separate **JustSlideAgent** profile and its own window; cross-profile content is never merged into one window until ownership/lifecycle is proven (ADR 0004). The dock shows agent workspace summaries; switching to one opens/focuses its window only on explicit user selection.

## Data flow
Every change (sidebar click, native menu, shortcut, extension, agent) mutates Chromium/WorkspaceService → observers (`TabStripModelObserver`, `WorkspaceService::Observer`) → debounced (16 ms) revisioned `ShellSnapshot` → sidebar. The UI never assumes it originated a change.
