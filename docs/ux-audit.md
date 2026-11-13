# UI/UX audit — native macOS feel (2026-11-13)

Scope: the trusted sidebar WebUI and window composition, measured against Apple's Human Interface
Guidelines for macOS (Mac-first; Apple Silicon and Intel) while keeping Windows viable. Evidence:
`tests/visual/ux-audit.ts` (Chromium 157 preview, computed styles for every visible text run and
control) → `docs/evidence/visual/ux-audit.json`; screenshots in `docs/evidence/visual/preview-*.png`.
Preview evidence only: the native app has not been built yet.

## Measured before → after
| Check (all fixtures) | Before | After |
|---|---|---|
| Text below WCAG contrast (4.5:1) | 13 per fixture (pinned count 3.0:1, "WORKSPACES" 3.0:1, agent scope 4.3:1) | **0** |
| Text under 11 px | "WORKSPACES" 10 px (+ decorative 9 px letter tiles) | **0** (tiles are aria-hidden icons) |
| Font sizes in use | 9, 10, 11, 12, 13 | **11, 13** (macOS Subheadline / Body) |
| Font weights in use | 510, 590 (Figma variable values) | **400, 500, 600** (SF Pro Regular/Medium/Semibold) |
| Controls under 24×24 | 0 | 0 |
| Hand (pointer) cursor | 0 | 0 |
| UI tests | 33 | **38** (+ native help tags, list arrow keys, context-menu routing, rename from native menu, inactive window) |

## Findings and fixes

### Typography
1. **Non-standard weights 510/590** came from Figma's SF Pro variable axis. → Regular 400 for body/rows, Medium 500
   for the agent name, Semibold 600 for section headers.
2. **Selected tab changed weight (510→590)**, so titles reflowed and re-truncated on selection. → Constant weight;
   selection is the row fill (as in Finder, Mail and Safari sidebars).
3. **Five sizes (9–13 px).** → macOS text styles only: Body 13/16 (rows, address, menus, buttons), Subheadline 11/14
   (headers, counts, captions). SF Pro Text tracking applied (−0.08 px at 13, +0.06 px at 11). Tabular numbers for counts.
4. **Uppercase "WORKSPACES" overline** (web convention). → Title-case "Workspaces", 11 pt semibold secondary, the
   macOS sidebar header style since Big Sur. "Pinned" uses the same style.
5. Address text was 12 px; → 13 px Body like every macOS text field. Placeholder now "Search or enter website name".
6. Font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI Variable Text", "Segoe UI"` (Windows).

### Colour and contrast
7. **Secondary text used opacity on a fixed colour** (`#304b48` × 0.6) and failed contrast. → An alpha-based label
   hierarchy tinted with the Figma ink (`rgba(14,27,27,.66)` secondary), like macOS `secondaryLabelColor`. It stays
   ≥ 4.5:1 on mint, on white surfaces and on custom backdrops.
8. Separator `#627f87` was a heavy rule. → Hairline `rgba(14,27,27,.12)` (macOS separator weight).
9. **Increase Contrast** (`prefers-contrast: more`) strengthens labels, separators and control outlines.
   **Reduce Transparency** turns glass into an opaque backdrop.

### Interaction (what made it feel like a web page)
10. **Custom dark tooltips** (Figma 30:122) → **native help tags** (`title`), with the system delay, font and
    placement. Toolbar help tags include the shortcut ("Back (⌘[)").
11. **Web-drawn context menus** → **native menus**. The WebUI sends `ShowContextMenu(kind, id, x, y)` and the browser
    builds a `ui::SimpleMenuModel` from authoritative state and runs it with `views::MenuRunner`: an **NSMenu** on macOS
    (accent highlight, VoiceOver, type-select), the Views menu on Windows. Title-case items with separators and no red
    destructive items (macOS convention). The preview keeps an NSMenu-styled fallback.
12. **Browser's default web context menu** (Back / Reload / Inspect) appeared on empty sidebar areas → suppressed
    everywhere except text fields, which keep the system Cut/Copy/Paste menu.
13. **Hover fill on every row** (web list pattern) → removed. macOS sidebars don't hover-highlight rows; the close
    button appearing on hover is the affordance. Toolbar buttons keep a soft hover bezel (macOS 26 toolbar behaviour),
    and every control gets a native-style pressed state.
14. **Focus was a custom teal glow** → the **system focus ring**: `AccentColor` at 60 %, 3 px, following the corner
    radius, keyboard-only (`:focus-visible`). It follows System Settings ▸ Appearance ▸ Accent colour.
15. **No list keyboard navigation** → ↑/↓ move between tab rows (across Pinned and Tabs), Home/End jump, Return/Space
    select, ⌥↑/⌥↓ reorder, ⌫ close, ⇧F10 / Menu opens the menu. The close button leaves the Tab order (row-level ⌫ instead).
16. **Hidden scrollbars** removed the scroll affordance → native overlay scrollbars (shown while scrolling, or always
    if the user set that in System Settings).
17. Whole-document rubber-banding, text-size adjust, image drag ghosts and text selection in chrome → disabled.
    Only the address field selects text. The arrow cursor is used everywhere.
18. **Inactive window**: selection and brand marks mute when the window isn't key, as in every Mac app.
    `BrowserWindowInterface::RegisterDidBecomeActive/Inactive` → `ShellSnapshot.window_active` → `html[data-window]`.
19. Disclosure chevron rotates (160 ms, off with Reduce Motion) and shows on hover/focus, as in Finder.
20. Dialogs (new or rename workspace, agent details) restyled as macOS alerts: centred semibold title, informative
    text, full-width buttons with the **default button in the accent colour on the right**, Return = default, Esc = Cancel.
    Button labels are title case ("Allow Once", "Revoke Access").

### Layout and spacing (8 pt rhythm inside the 6 px frame)
21. Uniform 8 px gaps flattened the hierarchy. → Title-bar row 32 · 8 · address 30 · 10 · favorites · 10 · Pinned ·
    hairline · rows · agent card · footer.
22. **Rows 32 px with 4 px gaps** read as cards. → 28 px rows 2 px apart (macOS medium sidebar density), 10 px
    leading inset, 7 px row radius. About 20 % more tabs fit at 720 px.
23. **Title bar**: the traffic lights had no reserved, aligned slot. → The leading 78 px of the 32 px row is reserved;
    the native host centres the lights on it (title bar 44 = 6 + 32 + 6, lights 13 px from the edge). The sidebar
    toggle follows the lights and history controls sit at the trailing edge (Finder/Safari on macOS 26). The row is a
    window-drag region.
24. Agent card compacted to two lines (48 px), with its pause button a proper bezel.

## Windows (kept viable)
`html[data-platform]` is set from the browser's platform. On Windows: no traffic-light reserve (caption buttons go
top-right over the page area, inside the 6 px frame), a 2 px accent focus ring, Segoe UI Variable, and Ctrl
shortcuts in help tags. Context menus use the same native path (Views menu). Mica/Acrylic for glass is listed in
`docs/chromium-integration.md`.

## Apple Silicon and Intel
The build pipeline builds for the host CPU, and `JUSTSLIDE_TARGET_CPU=arm64` cross-compiles an Apple Silicon build on
the Intel Mac (into its own out dir; it can't run there). A universal app is assembled from both out dirs with
`chrome/installer/mac/universalizer.py` (present at the pin). The UI has no per-architecture code.

## Still native work (needs the compiled app)
* Hidden title bar + traffic-light placement (`kTitlebarHeightDip`, `kTrafficLightsLeadingDip`) in the Mac frame.
* Drag region for the title-bar row (Chromium ignores `-webkit-app-region` in top-chrome WebUI; the host must
  report the rect as a draggable caption area).
* Glass: `NSVisualEffectView` behind the frame and a transparent sidebar `WebContents` base colour.
* Verify the native menus, help tags, focus ring and inactive state by screenshotting the running app through SimBridge.
* Menu strings into GRIT for localisation.

## Deliberate deviations from Figma (owner-approved direction "follow Apple guidelines")
Row height 32→28, weights 510/590→400/500/600, uppercase overline→title case, dark tooltips→native help tags,
dashed focus→system focus ring, no row hover. `tests/visual/figma-compare.ts` therefore now measures intentional
drift (it is diagnostic, not a gate).
