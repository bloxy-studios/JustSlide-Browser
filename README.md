# JustSlide

An everyday **Chromium-based macOS browser** (justslide.app) where people and *authorised* local
agents use the same browser operations (workspaces, tabs, favorites, screenshots) without agents
taking over the person's page or keyboard focus. The interface is built from the JustSlide Figma
design.

> **Status (2026-11-13).** The JustSlide browser binary has **not been built yet**. The Chromium
> build runs on the owner's Intel Mac through SimBridge and is waiting for the project to be
> approved there. Everything marked *runtime-tested* below ran in a UI preview or a test double,
> not in JustSlide. See `docs/progress.md` for the full matrix and resume commands.

## What exists

| Area | State | Evidence |
|---|---|---|
| Pin: Chromium **157.0.8103.51** (`653674df…`) | resolved from official release data; Xcode 26.6/SDK 26.5 on Intel supported by the pin | `chromium.lock.json`, `docs/chromium-integration.md` |
| Engine pipeline (resumable, 52-min steps, baseline first) | implemented; budget-stop verified locally | `scripts/engine/pipeline.py` |
| Patch series (3 patches) | applies cleanly + idempotent vs pristine pinned files | `bun run engine:verify-patches` |
| C++ integration (WebUI, Mojo, workspaces, tab ids, background ops, grants, socket) | implemented, **not compiled** | `browser/integration/justslide/` |
| Figma read through Composio MCP (6 frames, 26 variables, 3 modes, 83 icon layers) | done | `design/figma/`, `docs/figma-integration.md` |
| Sidebar UI: Figma-derived design system, React 19, CSS Modules, Nucleo glyphs + theSVG marks | built; 26 tests pass | `bun run test:ui` |
| Sidebar under Chromium 157's WebUI CSP with **zero** Trusted Types policies | 0 errors, 0 violations, 0 egress (Chrome for Testing 157.0.8103.51) | `docs/evidence/visual/webui-csp-report.json` |
| Preview vs Figma (sidebar column, 35:13 mint, 55:120 light, 55:411 dark, 1:6) | ~7.7–8.2 % pixels differ, mostly font rasterisation (Linux, no SF Pro) and letter-tile favicons | `docs/evidence/visual/figma-compare.json` |
| `justslide-mcp` (Rust, rmcp) | built + 10 tests in session 1 vs a browser test double | `bun run mcp:test` |

## Prerequisites
* UI/protocol: Bun 1.4.4, Python 3. MCP bridge: Rust ≥ 1.88 with a C linker.
* Native browser: a Mac with full Xcode (26.6 on Intel; 27+ on Apple Silicon), APFS, ≥ 16 GB RAM,
  **≥ 70 GB free** for the lean build (release component, no symbols). Intel (x64) and Apple
  Silicon (arm64) are separate builds; only x64 is reachable today.

## Commands
```bash
bun install
bun run check                 # protocol/token/icon drift, typecheck, UI tests, WebUI build+audit, MCP tests, patch verification
bun run dev:ui                # preview at http://localhost:41730/preview.html?fixture=figma-compact
CHROME=/path/to/chrome bun run test:visual   # CSP/TT check + Figma comparison (preview evidence)

# On the Mac (or through SimBridge project_run_script):
bun run engine:step           # repeat until engine:status shows all steps done
bun run engine:status
bun run engine:errors         # first compile errors of the last build
```

## Layout
`browser/` Chromium integration (C++/Mojo/GN) · `patches/chromium/` ordered patches ·
`ui/browser-chrome/` sidebar WebUI · `design/` Figma snapshot + token map · `protocol/` agent
command registry · `mcp/` runtime MCP bridge · `scripts/` engine/UI/design tooling · `tests/`
fixtures and visual checks · `docs/` (start with `docs/progress.md`). Rules for contributors and
agents: `AGENTS.md`. Design contract: `DESIGN.md`.

## Known limits
Native build pending (owner approval on SimBridge, then hours of build time). The C++ side has
never been compiled. Sidebar placement inside Chromium's window layout is still open. Nucleo
redistribution in this public repository needs confirmation (`docs/icons-and-assets.md`). No
mascot in the Figma frames or the repo. The Figma "agent working" state is illustrative: real
agent pairing UI isn't built yet.
