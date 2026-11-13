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

## Themes
`data-theme` on `<html>`: `mint` (Figma mode 50:0, default), `light` (50:1), `dark` (55:1).
`resolveTheme(colorMode, backdrop)`: dark when the colour mode (or the system) is dark; otherwise
mint for the mint backdrop or an unset one, light for anything else. A custom backdrop overrides
only `--js-color-frame` / `--js-color-sidebar`.

## Colour tokens (`--js-color-*`)
Values per theme are in `tokens.generated.css`; each line names its source (`figma 55:xx`,
`figma literal`, or `derived`). Derived values, which are not in Figma, are:
| Token | Why derived |
|---|---|
| `tab-hover`, `focus-ring`, `close-glyph` (dark) | Figma defines these only on light/mint component variants |
| `danger` (all) | crashed/failed tab and insecure-origin markers are not designed |
| `tooltip`, `tooltip-text` (light, dark) | bound only in mint frames; the mint values are reused |

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
From `design/tokens.json` (`--js-size-*`, `--js-radius-*`): sidebar 240, frame padding/gap 12,
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
* **Menu** (tab/favorite/workspace context menus): address-bar surface, strong border, 28 px rows.
* **Dialog** (new/rename workspace, agent details): agent-card surface, 224 px wide.
* **Collapsed rail** (56 px): the collapsed sidebar is not designed.
* **Loading spinner, crash/error dot, "Not secure" label**; audio indicator not drawn yet.
* **Resume glyph**: JustSlide placeholder until a licensed Nucleo play icon is added.

## Accessibility
Every icon-only control has an accessible name (tested). Favorites and workspace buttons have
distinct names. Keyboard: Tab order follows the visual order; Shift+F10 / ContextMenu opens
menus; Alt+↑/↓ reorders tabs; Delete closes the focused tab; Escape reverts the address field.
`prefers-reduced-motion` disables animation.

## Responsive behaviour
The sidebar has a fixed width. Vertical space shrinks the tab list, which scrolls on its own, while
the footer and agent card stay visible. At 1100×720 the layout matches 35:13; at 1440×1024 it
matches 1:6 apart from the 6 vs 12 px padding conflict. Long titles truncate with an ellipsis, and
the workspace switcher scrolls horizontally beyond four workspaces (not designed).
