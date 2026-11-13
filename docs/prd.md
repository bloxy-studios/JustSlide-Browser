# PRD — JustSlide

## Users & jobs
* **Person**: browse every day in a calm, compact browser; organize work into workspaces; keep favorites; never lose their place.
* **Person delegating to an agent**: let a local agent (Cursor, Claude Code, ChatGPT desktop via local MCP) research in the background — open/pin tabs, collect screenshots, build favorites — while they keep typing in their own page.
* **Agent**: discover permitted capabilities, act through scoped grants, receive structured errors, never need the person's mouse.

## Differentiator
Complete, deliberate, permission-controlled *application* programmability. Not a permanent chatbot sidebar; not remote mouse control.

## First vertical slice — acceptance
1. Real Chromium binary with JustSlide identity + isolated profile.
2. Sidebar WebUI (React/ADS) hosting real tabs: URL/title/loading reflected; select/create/close/reopen/pin/move.
3. Workspaces create/rename/select; favorites add/remove/reorder; restart restoration.
4. Authenticated local MCP on the same instance; agent workspace + 3 background tabs + pin + favorite without focus change; correct-tab capture; unauthorized/hostile access rejected; revoke works.
5. One real MV3 fixture runs and its tab changes appear in the sidebar.
6. 1440×1024 and 1100×720, dark/custom backdrop, keyboard-only.

## Non-goals (now)
Cloud relay/remote MCP, sync, AI uploads/telemetry, Windows/Linux support claims, store distribution, DRM, custom privileged schemes, an in-app chatbot.

## Roadmap (after slice)
History search, downloads, site permissions, settings, extensions manager (ADS), find, zoom, print/PDF, DevTools entry, private windows, audio indicators, split view (upstream split tabs), page interaction tools (approved click/type), extension lifecycle tools, native JustSlide plugins (constrained manifests), performance budget, signed/updated releases.
