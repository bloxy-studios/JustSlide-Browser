# JustSlide

An everyday **Chromium-based** browser where people and *authorized* local
agents use the same browser operations — workspaces, tabs, favorites,
screenshots — without agents ever stealing the person's page or focus.

> **Status (2026-11-11): foundation + verified portable slice. The native
> JustSlide binary has not been built yet.** See `docs/progress.md` for the
> exact feature matrix. Nothing below is shipped.

## What exists and what is verified

| Area | State | Evidence |
|---|---|---|
| Upstream pin: Chromium **157.0.8103.51** (`653674df…`, Mac Stable 100%) | resolved from official release data | `chromium.lock.json`, `docs/sources.md` |
| Patch series (3 patches, 35 upstream lines) | **applies cleanly + idempotent** against pristine pinned files | `bun run engine:verify-patches` |
| C++ integration (WebUI controller, Mojo, workspaces, durable tab ids, background tab ops, grants, automation socket) | implemented, **not compiled** | `browser/integration/justslide/` |
| Sidebar WebUI (React 19 + real ADS, Compiled, Parcel) | built; 18 component tests pass | `bun run test:ui` |
| Sidebar under real WebUI CSP + Trusted Types in Chromium 157 renderer | **0 violations, 0 egress** (Chrome for Testing, not JustSlide) | `docs/evidence/visual/webui-csp-report.json` |
| Protocol registry + TS/C++ codegen + drift check | implemented | `bun run protocol:check` |
| `justslide-mcp` (Rust, rmcp 3.9, stdio) | built; 10 tests pass incl. end-to-end over stdio vs a browser test double | `bun run mcp:test` |
| Native browser build, MV3 fixture run, focus demo | **blocked** in the authoring sandbox (Linux, 2 vCPU, 4 GB RAM, 24 GB disk) | `docs/evidence/environment.txt` |

## Prerequisites
* UI/protocol/bridge: Bun 1.4.4, Rust ≥ 1.88, Python 3, git.
* Native browser (macOS): Xcode with macOS SDK ≥ 27.0 (pin's official SDK), APFS volume, ≥ 16 GB RAM (32+ recommended), ≥ 120 GB free, many hours of CPU. Intel (x64) and Apple Silicon (arm64) are separate builds — see `docs/development-and-release.md`.

## Commands
```bash
bun install                 # JS deps (hoisted; see bunfig.toml)
bun run doctor              # fast prerequisites
bun run check               # everything that runs without a Chromium checkout
bun run dev:ui              # PREVIEW: simulated state at http://localhost:41730 (not the browser)
bun run test:visual         # needs CHROME=/path/to/chrome-for-testing (preview evidence)
bun run mcp:build           # mcp/target/release/justslide-mcp

# Native (macOS host with resources):
bun run doctor:engine
bun run engine:fetch -- --yes          # pinned checkout in ~/justslide-engine (outside this repo)
bun run engine:gn -- baseline && bun run build:browser -- baseline   # unmodified baseline first
bun run engine:patch && bun run engine:stage-ui
bun run engine:gn -- dev && bun run build:browser -- dev chrome browser_tests unit_tests
bun run launch -- dev                  # disposable isolated profile
```
`dev:ui` is a design preview only; `build:browser` + `launch` is the browser.

## Layout
`browser/` native integration (C++/Mojo/GN, GRIT resources) · `patches/chromium/` ordered upstream patches · `ui/browser-chrome/` sidebar WebUI · `protocol/` canonical command/event registry · `mcp/` stdio MCP bridge · `scripts/` doctor/engine/ui tooling · `tests/` fixtures + visual checks · `docs/` PRD, architecture, ADRs, evidence.

## Known limitations
Native build unverified; Figma not accessible from the authoring environment (visual fidelity unverified); Atlassian Sans/Mono unavailable (system-font fallback); ADS license scope for an independent browser is an **open legal question** that blocks release — see `docs/licensing-and-assets.md`.
