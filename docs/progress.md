# Progress — session 1 (2026-11-11)

## Environment actually used
Linux x86_64 (Amazon Linux 2023), 2 vCPU, 4 GB RAM, no swap, ~24 GB free. No macOS, no Xcode, no Figma access, Cursor not installed. → Chromium fetch/build **blocked** (needs ≥16 GB RAM, ≥120 GB disk; macOS for the target). Evidence: `evidence/environment.txt`.

## Feature-status matrix
| Feature | planned | implemented | built | runtime-tested | notes |
|---|---|---|---|---|---|
| Chromium pin + lock | ✓ | ✓ | – | – | 157.0.8103.51 |
| Patch series 0001–0003 | ✓ | ✓ | – | applies+idempotent vs pristine | `engine:verify-patches` |
| Fetch/sync/gn/build/launch/package/upstream scripts | ✓ | ✓ | – | prerequisite paths only | fail honestly here |
| Sidebar WebUI controller + CSP + Mojo broker | ✓ | ✓ (C++) | ✗ | ✗ | uncompiled |
| PageHandler (tabs/workspaces/favorites/nav/appearance) | ✓ | ✓ (C++) | ✗ | ✗ | agent controls stubbed |
| Durable tab identity via session extended info | ✓ | ✓ (C++) | ✗ | ✗ | |
| Background tab create / hidden capture / AX snapshot | ✓ | ✓ (C++) | ✗ | ✗ | browser tests authored |
| Sidebar host in BrowserView | ✓ | partial | ✗ | ✗ | **layout slot unresolved** |
| AutomationServer (socket, endpoint.json) | ✓ | partial | ✗ | ✗ | connection loop not written |
| GrantStore + CommandDispatcher | ✓ | ✓ (C++) | ✗ | ✗ | unit test authored |
| Sidebar React/ADS UI | ✓ | ✓ | ✓ | jsdom 18 tests; CfT-157 CSP/TT preview | not native |
| Trusted Types glyph policy | ✓ | ✓ | ✓ | CfT-157 0 violations | |
| Protocol registry + codegen + drift | ✓ | ✓ | ✓ | ✓ | |
| justslide-mcp | ✓ | ✓ | ✓ | vs test double (10 tests) | not vs browser |
| MV3 fixture | ✓ | ✓ | – | ✗ | |
| Focus-preserving E2E demo | ✓ | – | – | ✗ | blocked on native |
| Pairing dialog, pending-request plumbing, events.poll | ✓ | ✗ | ✗ | ✗ | |

## Blockers
1. Hardware: native build needs a Mac with ≥16 GB (32 recommended) RAM, ≥120 GB free APFS, Xcode + macOS SDK ≥ 27.0.
2. Legal: ADS license scope for an independent browser; Atlassian Sans/Mono rights.
3. Design access: Figma nodes 1:6 / 30:52 / 35:13 not inspected; mascot + app icon assets missing.

## Resume commands
```bash
git clone https://github.com/bloxy-studios/JustSlide.git && cd JustSlide
bun install && bun run check                 # expect all green
bun run doctor:engine                        # on the Mac; record output in docs/evidence/
bun run engine:fetch -- --yes
bun run engine:gn -- baseline && bun run build:browser -- baseline chrome
bun run launch -- baseline                   # baseline evidence
bun run engine:patch && bun run engine:stage-ui
bun run engine:gn -- dev && bun run build:browser -- dev chrome browser_tests unit_tests
# fix compile errors in browser/integration/justslide (edit here, re-run engine:patch)
$HOME/justslide-engine/chromium/src/out/dev-$(uname -m | sed s/x86_64/x64/)/browser_tests --gtest_filter='JustSlide*'
```

## Next prioritized tasks
1. Baseline build on the founder's Mac (record CPU: Intel vs Apple Silicon).
2. Compile `src/justslide`; resolve sidebar host layout (Open Q1) and owning-window injection (Open Q2).
3. Run JustSlide browser_tests; then manual spike checklist (milestone C).
4. Finish AutomationServer connection loop; pairing dialog; run `mcp_stdio`-style test against the real socket.
5. Legal review request for ADS + fonts; Figma inspection for fidelity.
