# Sources (accessed 2026-11-11; updated 2026-11-13)

| Source | Used for |
|---|---|
| https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Mac | pin 157.0.8103.51 → 653674df293788cf4932c40d914e9e15b41a2d31 |
| https://versionhistory.googleapis.com/v1/chrome/platforms/mac/channels/stable/versions/all/releases?filter=endtime=none | rollout fractions (157.0.8103.51 = 1; 158.0.8127.18 = 0.005) |
| https://chromium.googlesource.com/chromium/src/+/653674df…/ (Gitiles `?format=TEXT`) | all upstream files/symbols cited in chromium-integration.md; docs/mac_build_instructions.md, docs/mac_arm64.md, build/config/mac/mac_sdk.gni |
| https://chromium.googlesource.com/chromium/src/+/653674df…/content/public/browser/url_data_source.cc | default WebUI CSP |
| https://googlechromelabs.github.io/chrome-for-testing/ + storage.googleapis.com/chrome-for-testing-public/157.0.8103.51/linux64/chrome-headless-shell-linux64.zip | preview-tier renderer |
| Figma file `nw47hqMLTtmBMksJ4BnJKb` via Composio MCP (FIGMA_GET_FILE_NODES, FIGMA_RENDER_IMAGES_OF_FILE_NODES), 2026-11-13 | layout, variables, components, icon SVGs (`docs/figma-integration.md`) |
| https://chromium.googlesource.com/chromium/src/+/refs/tags/157.0.8103.51/build/config/mac/mac_sdk.gni, mac_sdk_overrides.gni | Xcode 26.6 / SDK 26.5 supported on Intel hosts; mac_sdk_min 15 |
| https://nucleoapp.com/license, https://thesvg.org/packages | icon licensing (`docs/icons-and-assets.md`) |
| npm registry (registry.npmjs.org) | exact package versions, peers, licenses |
| https://crates.io/crates/rmcp (3.9.0, 2026-11-05, MSRV 1.88) + crate source | MCP SDK API |
| https://cursor.com/docs/rules, /docs/mcp, /docs/reference/ignore-file | rule frontmatter, mcp.json, ignore semantics |

Not reachable in session 1: Figma (read in session 2 through Composio). Cursor app (not installed — config validated against docs only).
