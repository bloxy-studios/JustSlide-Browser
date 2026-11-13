# DESIGN.md — JustSlide × Figma contract

**Source of truth:** Figma file `Slide` (`nw47hqMLTtmBMksJ4BnJKb`, version `2421338396059629851`,
last modified 2026-11-13T13:25:48Z), read through the **Composio MCP Figma toolkit** on 2026-11-13
(see `docs/figma-integration.md`). The file keeps the name *Slide*; that does not rename this
repository or touch the separate Slide implementation.

| Node | Frame | Used for |
|---|---|---|
| `1:6` | Desktop - 1 (1440×1024, mint mode) | Main composition, expanded Pinned, tooltips |
| `30:52` | Slide / Interaction states (400×790) | Tab component states, hover labels, behaviour notes |
| `35:13` | Slide / Compact - agent working example (1100×720) | Collapsed Pinned, agent card, activity dot |
| `55:120` / `55:411` | Theme Preview Light / Dark (1100×720) | Light and dark variable modes |
| `50:26` | Frame 1 (empty) | — |

Committed derivatives: `design/figma/snapshot.json` (layout/style facts per node),
`design/tokens.json` → `ui/browser-chrome/src/design-system/tokens.generated.css`,
`ui/browser-chrome/assets/icons/` (SVG exported from the design's own icon layers).

## 0. Owner decisions (2026-11-13) — these override the Figma file
1. **Mint only.** No dark (55:411) or light (55:120) theme. The backdrop is the user's choice:
   mint (default), any solid colour, or **frosted glass** (see-through, blurred desktop, optional tint).
2. **Shadows instead of strokes/borders.** Selected tab, selected workspace, agent card, menus,
   dialogs and the page window use soft shadows (`--js-shadow-*`). Keyboard focus is a soft glow
   rather than Figma's dashed stroke. The pinned/tabs separator line is kept for now.
3. **No preset favorites.** The Figma tiles are sample content. People drag a tab (or a link)
   onto the favorites row to add it, and drag tiles to reorder. The + tile adds the current page.
4. **Gmail uses the 2026 mark** (theSVG `gmail-2026`), matching Gmail's current favicon.
5. **One backdrop layer, 6 px edges.** The sidebar has no fill of its own; the window backdrop
   (mint, custom colour or glass) is painted once and shows through, so sidebar and background blend.
   Frame padding and the sidebar→page gap are both 6 px (Figma 1:6 padding).

## 1. Window composition (35:13 / 55:*)
`[6 frame padding][Sidebar column 240][6 gap][Web Page Window, r16, shadow][6 padding]` (owner decision §0.5)
* The **sidebar** is the trusted WebUI (`chrome://justslide-sidebar.top-chrome`), 252 px wide
  including the padding and the gap, with a transparent background. The **Web Page Window** is genuine Chromium WebContents in
  a native view with radius 16 and a 1 px `page-border` stroke. No page DOM in the shell and no
  shell DOM over pages.
* The window backdrop (`frame`) and the sidebar share a colour. Mint (`#acfff7`, variable mode
  50:0) is the default; custom solid colours and frosted glass replace only frame/sidebar.
  With glass, the window uses native macOS vibrancy and the sidebar document is translucent;
  control surfaces stay mostly opaque for legibility.
* Frame 1:6 uses 6 px frame padding; the newer 1100×720 frames use 12 px. **JustSlide uses 6** (owner).

## 2. Sidebar order (Figma 1:9; enforced by `sidebar.test.tsx`)
1. **Navigation Controls** (6:17), 40 high: toggle, then Back · Forward · Reload (Stop while loading).
   Right-aligned (`primary=MAX`) so the macOS window buttons keep the left ~76 px.
   *Conflict:* Theme Preview frames 55:* put the toggle at the far left (space-between), which would
   collide with the traffic lights. JustSlide follows 1:6/35:13.
2. **Address Bar** (7:46), 240×32 r8: host at rest ("figma.com"), full URL while editing.
3. **Website favorites** (7:87): five 43×34 r8 tiles per row, gap 4, plus a dashed "add" tile.
4. **Pinned Section** (25:4): 28 px trigger (pin · "Pinned" · count · chevron), collapsible.
5. **Section separator** (35:160), 224 px, only when pinned tabs exist.
6. **New Tab** (12:140) + **tab list** (12:289) that scrolls independently.
7. **Background agent activity** (35:313), only while an agent grant exists.
8. **Workspace footer** (12:290): "WORKSPACES" + current name; Downloads · switcher · New workspace.

Behaviour notes from 30:52, verbatim: *Favorites = websites · Pinned = persistent workspace tabs ·
Tabs = current browsing session · Workspace dock = switch tab collections. The tab list scrolls
independently. The workspace dock stays visible.* Accessible names keep favorites and workspaces
distinct ("Open ChatGPT website" vs "Switch to ChatGPT workspace"). A workspace icon is not
evidence that a service is connected or an agent is running.

## 3. Components (product-owned, `ui/browser-chrome/src/design-system` + `components`)
| Figma | JustSlide | Notes |
|---|---|---|
| `Slide / Tab` set 30:100 (Default, Hover, Selected, Keyboard focus) | `TabRow` | 32 px, favicon 16, close target 24 r6 shown on hover/selected |
| `Slide / Tooltip` 30:122 | `TooltipLayer` / `useTooltip` | 224×32 r8, dark fill; below favorites, above the dock |
| Navigation targets 23:3…23:6 | `IconButton` | 32×32, icon 16 |
| Favorite tile 7:47… / Add 20:19 | `FavoritesGrid` | empty by default; drag tab/link to add, drag to reorder; brand marks for curated sites, favicons otherwise |
| Pinned trigger 7:88 | `PinnedSection` | state persisted in sidebar storage |
| Agent card 35:313 | `AgentActivity` | details dialog: pending requests, pause, revoke |
| Workspace switcher 20:17 + dot 35:322 | `WorkspaceFooter` | 7 px activity dot with 1.5 px ring |
| — (not in Figma) | `Menu`, `Dialog`, collapsed rail | derived styling, documented in `docs/design-system.md` |

## 4. Native exceptions
macOS traffic lights, the application menu, file pickers, permission prompts, download and auth
dialogs, and the pairing dialog stay native. Anything that must cross the content boundary uses
Chromium Views bubbles anchored to the sidebar host; a CSS z-index cannot leave the sidebar WebContents.

## 5. Assets
* General glyphs: **Nucleo**, as placed in the Figma file (layer names such as
  `sidebar-right-outline-48`, `refresh-outline-24`). Brand marks: **theSVG** slugs as placed in
  Figma (`openai-chatgpt`, `claude`, `gmail-2026`, `codex-openai`, `claude-code`). Provenance and
  licensing per icon: `ui/browser-chrome/assets/icons/registry.json`, `docs/icons-and-assets.md`.
* The blue peeking **mascot does not appear in any inspected Figma frame** and is not in this
  repository, so nothing renders it. No generated replacement art.
