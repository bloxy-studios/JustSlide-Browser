# AGENTS.md — operating rules for JustSlide

JustSlide is a Chromium (`//chrome`) downstream browser whose sidebar is a
trusted React/ADS WebUI and whose features are programmable by authorized
local agents through the same browser-process operations the human uses.

## Ground rules
1. Chromium is authoritative for browser state. JustSlide stores only workspaces, grants and presentation prefs.
2. Agents never activate, focus or navigate the person's active page; sensitive actions become visible pending requests.
3. Status words mean things: **planned · implemented · built · runtime-tested · blocked**. A preview or test double is never native evidence.
4. Leave the separate `Slide` repo/app untouched. Never import another browser's profile data.
5. No force-push, resets of user work, secret commits, paid infra, publishing or signing without explicit approval.

## Where things are
| Need | Go to |
|---|---|
| What works today + resume commands | `docs/progress.md` |
| Plan / milestones | `docs/plan.md` |
| Upstream pin, patches, build | `chromium.lock.json`, `docs/chromium-integration.md`, `patches/chromium/` |
| Protocol (single source of truth) | `protocol/registry/justslide.protocol.v1.json` → `bun run protocol:gen` |
| Sidebar UI | `ui/browser-chrome/` (`DESIGN.md`, `docs/design-system.md`) |
| MCP bridge | `mcp/` (`docs/mcp-and-plugins.md`) |
| Security model | `docs/security-and-privacy.md` |

## Before you commit
`bun run check` (protocol drift, typecheck, UI tests, WebUI bundle audit, MCP tests, remote patch verification). Native work additionally: `scripts/doctor.sh --engine`, baseline build first, then `docs/progress.md`.

Cursor rules in `.cursor/rules/` scope the details (Chromium integration, ADS UI, testing/handoff).
