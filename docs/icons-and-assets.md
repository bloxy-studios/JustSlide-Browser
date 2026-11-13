# Icons and assets

Registry: `ui/browser-chrome/assets/icons/registry.json`. Every icon names its file, kind
(`glyph` | `brand`), source, Figma node and licence. `bun run build:icons` generates
`src/generated/icons.ts`; icons render as SVG elements (no `innerHTML`, no CDN, no runtime fetch).
`bun run licenses:ui` writes the package and icon licence inventory to `docs/evidence/ui-license-audit.json`.

## General glyphs — Nucleo
Source: the Nucleo glyphs the designer placed in the Figma file (layer names are Nucleo icon
names), exported as SVG through the Composio Figma toolkit and recoloured to `currentColor`.

| Registry name | Nucleo name | Figma node |
|---|---|---|
| sidebar-toggle | sidebar-right-outline-48 | 6:18 |
| back / forward | chevron-right-outline-24 (back is mirrored in Figma) | 7:34 / 7:31 |
| reload | refresh-outline-24 | 7:41 |
| add-favorite | plus-outline-duo-18 | 20:77 |
| pin | pin-tack-fill-48 | 7:89 |
| new-tab | plus-fill-24 | 12:145 |
| workspace-personal | user-laptop-outline-duo-18 | 20:11 |
| new-workspace | plus-outline-18 | 18:2 |
| downloads | receive-square2 | 13:291 |

**Provenance unconfirmed** (Figma layers not named as Nucleo icons, so possibly drawn in Figma):
`close` (I30:103;30:87), `pause` (35:320), `chevron-down` (30:119), `chevron-right` (55:506).
**Placeholder:** `resume` is a JustSlide-drawn triangle because the design has no play glyph.
Replace it with a licensed Nucleo icon (e.g. a 14 px media-play from the same family).

### Licence (https://nucleoapp.com/license, read 2026-11-13)
Standard License: unlimited personal and commercial projects. Public source must **include the Nucleo copyright notice** (see `NOTICE`). **"You can include up to 100 Nucleo
icons in publicly accessible source files, including open-source projects."** No redistribution
beyond that, no icon libraries or packs, and no letting users browse Nucleo icons without an
Extended License. This repository is public and commits **10** Nucleo glyphs; `gen-icons.ts`
fails the build above 100.
**Owner action:** confirm that the Nucleo licence covering the Figma file belongs to the
JustSlide team (each team member who manages Nucleo icons needs their own licence). Nucleo's
React packages and its MCP (local, account-based) were not used. The Figma export is the
authorised copy of the exact glyphs in the design.

## Brand marks — theSVG
Source: `@thesvg/icons@4.0.9` (npm integrity in `assets/icons/brands/thesvg/thesvg.lock.json`),
vendored by `bun scripts/ui/vendor-thesvg.ts`. Only these 14 marks ship. Variants were chosen to
match the marks placed in Figma (contact sheet compared on 2026-11-13).

| Registry name | theSVG slug / variant | Entry licence | Used for |
|---|---|---|---|
| brand-youtube | youtube / default | CC0-1.0 | favorite |
| brand-chatgpt | openai-chatgpt / default (same slug as the Figma layer) | MIT | favorite + ChatGPT workspace |
| brand-claude | claude / default | CC0-1.0 | favorite |
| brand-gmail | gmail / default | CC0-1.0 | favorite (Figma uses theSVG `gmail-2026`, whose entry licence is "Trademark"; the CC0 classic mark ships until the owner chooses) |
| brand-aws | aws / default | MIT | favorite |
| brand-github | github / default | CC0-1.0 | favorite |
| brand-slack | slack / default | MIT | favorite |
| brand-notion | notion / default | CC0-1.0 | favorite |
| brand-discord | discord / default | CC0-1.0 | favorite |
| brand-netflix | netflix / default | CC0-1.0 | favorite |
| brand-supabase | supabase / default | CC0-1.0 | favorite |
| brand-convex | convex / default | CC0-1.0 | favorite |
| brand-codex | codex-openai / default | MIT | Codex workspace |
| brand-claude-code | claude-code / default | MIT | Claude Code workspace, agent card |

Rules: brand marks keep official colours (`currentColor` in a mark resolves to its ink, not the
theme), and they are never recoloured to match the UI. A mark identifies the real service; it
implies no partnership, endorsement, connection or running agent. theSVG's code is MIT, but each
mark stays its owner's trademark (theSVG LEGAL/TRADEMARK notes, nominative use). Check each
brand's guidelines before any public release.
Ordinary websites use their **real favicon** from Chromium (`chrome://favicon2`); only the
curated shortcuts that appear in Figma map to brand marks (`src/lib/brands.ts`).

Attribution for MIT-licensed theSVG entries and the theSVG library is in `NOTICE`. Avoid entries with `brand-use` or `Trademark` licences (e.g. `codex`, `gmail-2026`) unless the owner approves.

## Mascot and app icon
The blue peeking mascot does not appear in any inspected Figma frame, and no source artwork is in
this repository, so nothing renders it. The app icon is also missing (`branding/README.md`). No
generated replacements.

## Fonts
SF Pro is the macOS system font and isn't bundled. Non-macOS previews fall back to a system
sans-serif, which explains most of the remaining preview-vs-Figma pixel differences.
