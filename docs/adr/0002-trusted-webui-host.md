# ADR 0002 — Trusted top-chrome WebUI for the sidebar
**Status:** accepted; host layout pending spike
**Decision:** The sidebar is `chrome://justslide-sidebar.top-chrome` (`TopChromeWebUIController`), React/ADS bundled locally via GRIT, hosted by a `views::WebView` in the leading-edge region. Mojo `justslide.mojom.PageHandler` bound only for this WebUI. CSP = Chromium defaults + `trusted-types default` (exact ADS glyph allowlist) + `connect-src 'none'` + favicon `img-src`.
**Why:** precedent (tab search, side panels), separate renderer from pages, real Mojo typing, no custom scheme.
**Rejected:** DOM overlays over pages; screenshot textures; `chrome.send` JSON handlers; privileged custom scheme.
**Open:** exact layout slot (chromium-integration.md §Open 1).
