# Plan (dependency-ordered milestones)

Status words: **planned · implemented · built · runtime-tested · blocked** (see `AGENTS.md`).

## A. Repository, environment, integrations — done (2026-11-13)
Foundation restored into `bloxy-studios/JustSlide-Browser` · Mac inspected via SimBridge (Intel x64,
macOS 26.5.1, Xcode 26.6; Chromium 157 explicitly supports Xcode 26.6 / SDK 26.5 on Intel hosts) ·
Figma read through Composio · icons inventoried · resumable engine pipeline written · pin unchanged
(157.0.8103.51, `653674df…`).

## B. Chromium foundation — in progress
1. Owner approves + trusts the Mac project (SimBridge dashboard). **blocked on owner**
2. `bun run engine:step` repeatedly (≤52 min each): doctor → depot_tools → shallow src at the tag
   → `gclient sync --no-history` → hooks → `gn gen out/JustSlide` (lean release component build)
   → `autoninja chrome` (resumable) → headless verification (version, DOM dump, screenshot).
   Exit: unmodified Chromium 157 built and launched on the Mac, evidence recorded.

## C. Figma design system — implemented
Tokens from Figma variables (mint/light/dark), Nucleo glyphs and theSVG brand marks from the
design's own layers, component rewrite, 26 UI tests, bundle audit, preview Figma comparison.
Remaining: licence confirmation for committed icon sources (`docs/icons-and-assets.md`), native
visual comparison (milestone D).

## D. Native UI integration
`engine:step` continues: apply patches → stage UI → rebuild → fix compile errors in
`browser/integration/justslide` (push, re-run `--only build_justslide`) → decide the sidebar host
layout slot (Open Q1 in `docs/chromium-integration.md`) → verify in the real binary: two tabs
reflected, switching keeps keyboard/IME, an overlay across the native boundary, an inactive agent
tab without focus steal, hidden-tab capture, the MV3 fixture, production resources. Native
screenshots of the compiled app through SimBridge `macos_*` tools are compared with Figma 35:13 / 55:*.

## E. Core browser functionality
Address/search via the omnibox classifier, tab lifecycle, favorites, pinned, workspaces,
persistence and restart reconciliation, settings/themes, shortcuts, error and loading states.

## F. JustSlide MCP
Automation socket connection loop, pairing dialog + Keychain, grants, pending requests, events,
pause/revoke wiring, focus-preserving demo (`docs/mcp-and-agents.md`).

## G. Extensions, security, performance
MV3 matrix, extension management entry points, hostile-page tests, profile isolation, concurrent
agents, benchmarks against the baseline build.

## H. Packaging and handoff
Per-CPU development packages (x64 first; arm64 needs an Apple Silicon host), licence review,
upstream update drill, release procedure (no signing or publishing without approval).
