# DESIGN.md — Slide layout × ADS contract

Source of layout/IA: Figma `Slide` (nodes 1:6 main, 30:52 states, 35:13 background agent).
**Figma was not reachable from the authoring environment (no Figma MCP, API 401), so
visual fidelity to those nodes is unverified.** The contract below follows the written
requirements; update it after a Figma inspection.

## 1. Composition
* Window = compact **sidebar (~240 dp)** + large rounded **page viewport**. The viewport is a
  native Chromium WebContents; the sidebar is a separate trusted WebUI WebContents. No page DOM
  in the shell; no shell DOM over pages.
* Backdrop: customizable color behind both (Figma mint is an *example*, not brand). Controls keep
  ADS surface tokens for contrast; backdrop never colors selection or security semantics.
* Collapsed: 48 dp rail with Show sidebar / Back / Forward / Reload / New tab (navigation never
  hidden without an alternative).

## 2. Sidebar order (invariant, enforced by `sidebar.test.tsx`)
1. Sidebar toggle · Back · Forward · Reload
2. Address/search field (full URL, security icon, Esc reverts, Enter → browser classifier)
3. Website-favorites grid (ChatGPT/Claude tiles open **websites**)
4. Collapsible **Pinned** section with count
5. New tab + independently scrolling tab list
6. Conditional background-agent status (only while a grant exists)
7. Persistent workspace dock with selected name (ChatGPT / Claude Code icons switch **workspaces**)

Accessible names keep 3 vs 7 distinct: "Open ChatGPT website" vs "Switch to ChatGPT workspace".
A workspace icon is not evidence of an agent connection.

## 3. ADS mapping
| Element | ADS |
|---|---|
| Nav / tab actions / dock | `IconButton` (`subtle`, `compact`), built-in tooltips |
| Address | `Textfield` `isCompact` + security glyph + `Tooltip` |
| Favorites / tab rows / pinned header | `Pressable` + `cssMap` tokens |
| Menus | `DropdownMenu` (keyboard alternatives to drag: Move up/down/left/right) |
| Agent status | elevated `Box` + `Lozenge` + `Button`; decisions in `ModalDialog` |
| Text | `Text`, `Heading` |
| Theming | `setGlobalTheme` light/dark/auto |

## 4. States
Hover/pressed via `color.background.neutral.subtle.*`; selected via `color.background.selected.*` +
`aria-current`/`aria-pressed`; disabled via ADS props; loading = `Spinner`; error/crash = status
icon + accessible name; agent-opened = AI glyph + name suffix. Reduced motion: global override in
`sidebar.css`. Gallery: `ui/browser-chrome/src/gallery.tsx`; screenshots in `docs/evidence/visual/`.

## 5. Typography
Figma's font is mapped to ADS typography tokens (`font.body*`, `font.heading*`). Target faces are
Atlassian Sans / Mono; they are **not available** to this project (gated), so the token stack falls
back to system UI fonts (measured: Liberation Sans on Linux CfT; expected SF on macOS). Exact
visual parity is blocked on font rights.

## 6. Native exceptions
macOS traffic lights, menus, file pickers, permission prompts, download/auth dialogs and the
pairing dialog stay native (security-critical). Bubbles that cross the content boundary are
Chromium Views widgets anchored to the sidebar host.

## 7. Assets
The existing blue peeking mascot is **not in this repository**; `Mascot` renders nothing until the
approved asset is added (`branding/README.md`). No generated replacement art. No third-party brand
marks are bundled; favorites use real site favicons via `chrome://favicon2`.
