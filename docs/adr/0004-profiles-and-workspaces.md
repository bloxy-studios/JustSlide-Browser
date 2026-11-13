# ADR 0004 — Profiles vs workspaces
**Status:** accepted (staged)
**Decision:** Workspace = organisation within a profile; profile = data boundary. External agents default to an isolated `JustSlideAgent*` profile with its own window; access to the personal profile requires an explicit grant. Until cross-profile hosting is proven, the dock shows agent-workspace summaries and opens/switches that profile's window only on explicit user selection. Favorites are profile-wide; tabs are workspace-scoped; pinned order follows TabStripModel invariants.
**Why:** prevents cookie/storage/extension bleed; honest about extension visibility within a profile.
