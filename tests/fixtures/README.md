# Deterministic local fixtures

| Fixture | Used by | Purpose |
|---|---|---|
| `pages/typing.html` | E2E demo step 1/4, `BackgroundTabDoesNotActivate` | Human keeps typing; counts focus loss |
| `pages/agent.html` | capture tests | Solid `#00ff00` page for hidden-tab capture assertions |
| `pages/hostile.html` | `WebPageCannotBindShellInterface`, prompt-injection review | Tries `chrome.send`, Mojo import, `window.open`/iframe of the sidebar WebUI; title/body contain injection text |
| `extensions/mv3-basic/` | `docs/extension-compatibility.md` matrix | Real MV3 service worker, content script, storage, messaging, tabs events, action popup, options page |
| `webui/justslide_shell.mojom-webui.js` | `tests/visual/webui-csp.ts` only | Stub of the generated Mojo module so the production sidebar bundle can be loaded under the real CSP in Chrome for Testing |

Serve pages locally: `bun scripts/dev/serve-fixtures.ts` (127.0.0.1:8765). No
fixture contacts the network; none uses real accounts.
