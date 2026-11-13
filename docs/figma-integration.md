# Figma integration (development time, via Composio MCP)

The Composio MCP connection is a **development-time** tool used by the coding agent to read the
design. It is unrelated to `justslide-mcp`, the runtime MCP bridge JustSlide exposes to agents.
Nothing in the shipped browser talks to Figma or Composio.

## Connection used (2026-11-13)
| Item | Value |
|---|---|
| MCP server | Composio (`https://connect.composio.dev`), connected to HyperAgent |
| Toolkit / account | `figma`, account `figma_pop-chasse` (Figma user `jryan100`), status ACTIVE |
| File | `Slide` — key `nw47hqMLTtmBMksJ4BnJKb`, role owner, version `2421338396059629851`, last modified 2026-11-13T13:25:48Z |
| Tools discovered and used | `FIGMA_GET_FILE_METADATA`, `FIGMA_GET_FILE_JSON` (depth 2), `FIGMA_GET_FILE_NODES` (full subtrees), `FIGMA_RENDER_IMAGES_OF_FILE_NODES` (PNG @1x/@2x, SVG) |
| Tried, unavailable | `FIGMA_EXTRACT_DESIGN_TOKENS` with variables → `missing required scope (file_variables:read)` |

Large responses land in Composio's remote sandbox; they were moved with
`COMPOSIO_REMOTE_WORKBENCH` → `upload_local_file` and downloaded with `curl -L`.
No credentials are stored in this repository.

## Nodes inspected
`1:6` Desktop - 1 · `30:52` Interaction states · `35:13` Compact agent example · `55:120` Theme
Preview Light · `55:411` Theme Preview Dark · `50:26` Frame 1 (empty). Component set `30:100`
`Slide / Tab` (variants 30:56 Default, 30:67 Hover, 30:78 Selected, 30:89 Keyboard focus) and
component `30:122` `Slide / Tooltip` with their descriptions.

## Extracted and committed
* `design/figma/snapshot.json`: per node box (frame-relative), fills/strokes (hex and bound
  variable id), radius, auto-layout (mode, gap, padding, alignment), text (characters, SF Pro size,
  weight, line height, letter spacing, truncation), component properties. Regenerate with
  `python3 scripts/design/figma_snapshot.py RAW.json… > design/figma/snapshot.json`.
* **Variables:** collection `VariableCollectionId:50:24`, modes `50:0` (mint), `50:1` (light), `55:1`
  (dark). Names are not readable without `file_variables:read`, so each variable is recorded by id,
  with the value resolved from every bound layer in each mode-pinned frame. 26 variables resolved.
  Semantic names live in `design/tokens.json`.
* **Icons:** 83 icon layers exported as SVG (light and dark frames). The ones the UI uses are
  committed under `ui/browser-chrome/assets/icons/` with their source node ids in `registry.json`.
* **Renders** (PNG) are kept as evidence on the build machine and in the session record, not in
  git (the GitHub write path available to the agent carries text only).

## Findings that shaped the implementation
* Text is **SF Pro** (weights 510/590), i.e. the macOS system font, so the Atlassian-font blocker of
  the previous foundation no longer applies.
* The UI frames bind every surface and text colour to variables. Only tab hover (`#f2fffd`), keyboard
  focus (`#10574f`, dashed 4/4) and the close glyph are literal values, and only in light/mint
  frames. Dark equivalents are derived and marked as such in `tokens.generated.css`.
* Tooltip colours are bound only in mint frames; light/dark reuse the mint values.
* Conflicts recorded in `DESIGN.md` §1–2 (frame padding 6 vs 12; toggle placement vs traffic lights).
* The mascot does not appear in any frame.

## Visual verification
`tests/visual/figma-compare.ts` renders the preview fixtures that reproduce 1:6 and 35:13 at the
same sizes and writes side-by-side and diff images next to the Figma renders. This is a **UI
preview** comparison. The required final comparison inside the compiled JustSlide app is tracked
in `docs/progress.md` and is not done yet.
