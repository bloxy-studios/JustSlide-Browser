# Sources (accessed 2026-11-11)

| Source | Used for |
|---|---|
| https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Mac | pin 157.0.8103.51 → 653674df293788cf4932c40d914e9e15b41a2d31 |
| https://versionhistory.googleapis.com/v1/chrome/platforms/mac/channels/stable/versions/all/releases?filter=endtime=none | rollout fractions (157.0.8103.51 = 1; 158.0.8127.18 = 0.005) |
| https://chromium.googlesource.com/chromium/src/+/653674df…/ (Gitiles `?format=TEXT`) | all upstream files/symbols cited in chromium-integration.md; docs/mac_build_instructions.md, docs/mac_arm64.md, build/config/mac/mac_sdk.gni |
| https://chromium.googlesource.com/chromium/src/+/653674df…/content/public/browser/url_data_source.cc | default WebUI CSP |
| https://googlechromelabs.github.io/chrome-for-testing/ + storage.googleapis.com/chrome-for-testing-public/157.0.8103.50/linux64/chrome-headless-shell-linux64.zip | preview-tier renderer |
| https://atlassian.design/llms.txt, /foundations/tokens/use-tokens-in-code/, /foundations/typography/, /license/ | ADS setup, babel plugin, fonts, license |
| npm registry (registry.npmjs.org) | exact package versions, peers, licenses |
| https://crates.io/crates/rmcp (3.9.0, 2026-11-05, MSRV 1.88) + crate source | MCP SDK API |
| https://cursor.com/docs/rules, /docs/mcp, /docs/reference/ignore-file | rule frontmatter, mcp.json, ignore semantics |
| https://compiledcssinjs.com (package READMEs/source in node_modules) | Parcel/Vite integration behaviour |

Not reachable: Figma file `nw47hqMLTtmBMksJ4BnJKb` (no Figma MCP/token in the authoring environment); Cursor app (not installed — config validated against docs only).
