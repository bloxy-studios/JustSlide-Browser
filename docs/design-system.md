# JustSlide design system

A small, product-owned system derived from the Figma file (`DESIGN.md`). It replaces the
Atlassian Design System used by the first foundation: Figma is the source of truth, the ADS
licence only covers add-ons for Atlassian products, and ADS needed a Trusted Types exception
and bundled a remote feature-flag client. The new bundle is plain React 19 with CSS Modules
(306 KB WebUI output, no remote host literals, no Trusted Types policy).

## Pipeline
```
Figma (Composio) ─► design/figma/snapshot.json ─┐
                    design/tokens.json ──────────┴─► scripts/design/gen-tokens.ts ─► src/design-system/tokens.generated.css
Figma icon layers ─► assets/icons/{glyphs,brands}/*.svg + registry.json ─► scripts/ui/gen-icons.ts ─► src/generated/icons.ts
```
`bun run build:ui` fails if either generated file is stale (`--check`).

## Appearance
One token theme, **mint** (Figma mode 50:0), on `:root`. Owner decision 2026-11-13: no dark or light
theme. `applyTheme(colorMode, backdrop)` ignores `colorMode` (kept in the protocol for
compatibility) and parses the backdrop: `""` = mint, `#rrggbb` = solid, `glass` / `glass:#rrggbb` =
frosted. Glass sets `data-material="glass"`: the frame/sidebar become a translucent tint
(`--js-glass-tint-alpha` 0.42) over native vibrancy, and surfaces become 82 % white.

## Shadows (`--js-shadow-*`, derived)
Replace every Figma stroke (owner decision): `control` (address, tiles, dialog fields), `selected`
(selected tab, selected workspace), `card` (agent card), `popover` (menus, dialogs), `page`
(page window), `focus` (2 px glow, replaces the dashed focus stroke), `drop` (drag target).

## Colour tokens (`--js-color-*`)
Values per theme are in `tokens.generated.css`; each line names its source (`figma 55:xx`,
`figma literal`, or `derived`). Derived values, which are not in Figma, are:
| Token | Why derived |
|---|---|
| `danger` (all) | crashed/failed tab and insecure-origin markers are not designed |

## Typography (`--js-type-*`)
SF Pro via `-apple-system, BlinkMacSystemFont, "SF Pro", system-ui`. Weights 510 and 590 are
variable-font weights of SF Pro on macOS.
| Token | Spec | Figma |
|---|---|---|
| tab / tab-selected | 13/18, 510 / 590 | Tab title |
| address | 12/18, 510 | Address |
| section | 12/18, 590 | "Pinned" |
| count | 11/18, 510, opacity .6 | Pinned count |
| overline | 10/16, 590, +0.6 tracking, upper, opacity .68 | "WORKSPACES" |
| caption | 11/16, 510 | current workspace, agent scope (opacity .72) |
| agent-title | 12/18, 590 | "Claude Code · Working" |
| tooltip | 12/18, 510 | Slide / Tooltip |

## Sizes and radii
From `design/tokens.json` (`--js-size-*`, `--js-radius-*`): sidebar 240, frame padding/gap 6 (owner decision), collapsed rail 44,
section gap 8, nav row 40, targets 32 / 24, icons 16 / 12 / 14, favorites 43×34 (icon 18, gap 4),
rows 32, pinned trigger 28, list gap 4, agent card 56, footer 64, activity dot 7.
Radii: control 8, small 6, card 10, page window 16, favicon 3.

## Components
| Component | File | States |
|---|---|---|
| `Icon` | `design-system/Icon.tsx` | glyph (`currentColor`) or brand (official colours); decorative unless labelled |
| `IconButton` | `design-system/IconButton.tsx` | hover, pressed, disabled (.35), dashed focus ring, `workspace` variant selected |
| `TooltipLayer` / `useTooltip` | `design-system/tooltip.tsx` | 450 ms hover delay, immediate on `:focus-visible`, below or above |
| `Menu` / `useMenu` | `design-system/Menu.tsx` | arrows, Home/End, Enter/Space, Escape/Tab; focus returns to the trigger and follows moved rows |
| `Dialog`, `Button`, `TextInput` | `design-system/Dialog.tsx` | native `<dialog>` (focus trap, Escape) |
| Sidebar parts | `components/*` | see `DESIGN.md` §3 |

### Not in Figma (derived, flagged for design review)
* **Menu** (tab/favorite/workspace context menus): address-bar surface, popover shadow, 28 px rows.
* **Favorites empty state + drag and drop**: + tile, then "Drag a tab here to add it". Drop targets glow (`--js-shadow-drop`). Keyboard alternatives: + tile, the tab menu's "Add to favorites", and Move left/right.
* **Dialog** (new/rename workspace, agent details): agent-card surface, 224 px wide.
* **Collapsed rail** (56 px): the collapsed sidebar is not designed.
* **Loading spinner, crash/error dot, "Not secure" label**; audio indicator not drawn yet.
* **Resume glyph**: JustSlide placeholder until a licensed Nucleo play icon is added.

## Accessibility
Every icon-only control has an accessible name (tested). Dragging always has a keyboard alternative. Favorites and workspace buttons have
distinct names. Keyboard: Tab order follows the visual order; Shift+F10 / ContextMenu opens
menus; Alt+↑/↓ reorders tabs; Delete closes the focused tab; Escape reverts the address field.
`prefers-reduced-motion` disables animation.

## Responsive behaviour
The sidebar has a fixed width. Vertical space shrinks the tab list, which scrolls on its own, while
the footer and agent card stay visible. At 1100×720 the layout matches 35:13; at 1440×1024 it
matches 1:6 apart from the 6 vs 12 px padding conflict. Long titles truncate with an ellipsis, and
the workspace switcher scrolls horizontally beyond four workspaces (not designed).
