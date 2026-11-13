# AGENTS.md — operating rules for JustSlide

JustSlide is a Chromium (`//chrome`) downstream browser for macOS whose sidebar is a trusted
React WebUI built from the Figma design, and whose features are programmable by authorised
local agents through the same browser-process operations the person uses.

## Ground rules
1. Chromium is authoritative for browser state. JustSlide stores only workspaces, grants and presentation prefs.
2. Agents never activate, focus or navigate the person's active page; sensitive actions become visible pending requests.
3. Status words mean things: **planned · implemented · built · runtime-tested · blocked**. A preview or test double is never native evidence.
4. Figma (`DESIGN.md`) is the visual source of truth. Do not introduce colours, sizes or icons that are not in `design/` or marked *derived* in `docs/design-system.md`.
5. Glyphs come from Nucleo and brand marks from theSVG (`ui/browser-chrome/assets/icons/registry.json`, `docs/icons-and-assets.md`). No other icon sets.
6. Leave the separate `Slide` repository/app and the Mac's `~/Developer/JustSlide` (WebKit build) untouched. Never import another browser's profile data.
7. No force-push, resets of user work, secret commits, paid infra, publishing or signing without explicit approval.

## Ownership map
| Path | Owner / nature |
|---|---|
| `browser/integration/justslide/`, `browser/resources/`, `patches/chromium/` | JustSlide-owned Chromium integration (copied to `src/justslide/` + ordered patches) |
| `.engine/` (git-ignored) | upstream Chromium checkout, depot_tools, build output, logs, evidence. Never commit |
| `design/figma/` | derived from Figma via Composio (regenerate; do not hand-edit snapshot) |
| `ui/browser-chrome/src/design-system/tokens.generated.css`, `src/generated/icons.ts` | generated (`bun run design:tokens`, `bun run build:icons`) |
| `ui/browser-chrome/assets/icons/` | third-party licensed assets (Nucleo, theSVG marks) + registry |
| `protocol/registry/` → `protocol/generated/` | single source of truth for agent commands → generated |
| `mcp/` | `justslide-mcp` runtime bridge (not the Composio MCP used for Figma) |

## Where things are
| Need | Go to |
|---|---|
| What works today + resume commands | `docs/progress.md` |
| Plan / milestones | `docs/plan.md` |
| Upstream pin, patches, engine pipeline | `chromium.lock.json`, `docs/chromium-integration.md`, `scripts/engine/pipeline.py` |
| Design contract | `DESIGN.md`, `docs/design-system.md`, `docs/figma-integration.md` |
| Icons and licences | `docs/icons-and-assets.md` |
| MCP bridge | `mcp/`, `docs/mcp-and-agents.md` |
| Security model | `docs/security-and-privacy.md` |

## Before you commit
`bun run check` (protocol drift, typecheck, UI tests, WebUI bundle audit, MCP tests, remote patch
verification). Native work runs on the Mac: `bun run engine:step` (resumable; see `docs/progress.md`).
