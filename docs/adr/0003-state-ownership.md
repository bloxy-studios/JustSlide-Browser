# ADR 0003 — State & persistence ownership
**Status:** accepted
**Decision:** Chromium owns browser objects. JustSlide persists only workspaces/selection/appearance (profile prefs, versioned), durable tab/workspace ids (NavigationEntry extended info → session restore), favorites (BookmarkModel folder), grants (prefs, token hash only). No parallel tab/cookie/download/bookmark database in React, Rust or SQLite.
**Why:** single source of truth; restore/duplicate/crash semantics come from Chromium.
**Consequences:** favorites appear in the bookmark manager (feature, documented); id reconciliation rules in data-and-protocol.md.
