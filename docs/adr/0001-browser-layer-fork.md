# ADR 0001 — Downstream `//chrome` fork with out-of-tree checkout
**Status:** accepted (2026-11-11)
**Decision:** Build JustSlide as a downstream of Chromium's full browser layer (`//chrome`) pinned in `chromium.lock.json`. The product repo holds product-owned sources, an ordered patch series and tooling; the Chromium checkout lives outside it (`~/justslide-engine`) and receives `src/justslide/` + patches.
**Why:** Keeps tabs, profiles, extensions, downloads, permissions, sessions and security UI from upstream; avoids gigabytes in git and nested repos/submodules that gclient doesn't model.
**Alternatives:** Electron (no full extension compatibility), content_shell (no browser layer), CEF Chrome runtime (legitimate, retains more of //chrome; not chosen without approval — revisit if fork cost exceeds budget), Tauri/WebKit (prior Slide architecture, out of scope).
**Consequences:** must track Chromium security releases; patch footprint budgeted; native builds need large Mac hardware.
