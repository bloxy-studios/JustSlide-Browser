# MCP & plugins

## justslide-mcp
Rust, `rmcp` **3.9.0** (official SDK; MCP spec 2026-07-28 default, negotiates down to 2024-11-05), features `server` + `transport-io` only. Owns stdio session negotiation; forwards to the running browser; holds no browser state. stdout = protocol only; logs on stderr (`RUST_LOG`).

* Discovery: `<user-data-dir>/JustSlideAutomation/endpoint.json` (default macOS `~/Library/Application Support/JustSlide Dev`); refuses files/dirs/sockets not owned by the euid, group/world-accessible, symlinked, or sockets outside a 0700 dir. Verifies `welcome.instanceId == endpoint.instanceId`.
* Token: macOS Keychain (`security find-generic-password -s app.justslide.JustSlide.dev.pairing -a <client>`) or `--token-file` (0600). Never argv/env/logs.
* Tools = registry commands ∩ `welcome.commands` (what this browser build implements and the grant allows). Not connected → only `justslide_capabilities_get` (returns `unavailable`); after connecting it emits `notifications/tools/list_changed`.
* Early validation (subset JSON Schema) rejects malformed calls before they reach the browser; the browser revalidates everything.
* Cancellation: MCP cancel → protocol `cancel` frame. Timeouts → cancel + `unavailable`.

### Implemented tool names
`justslide_capabilities_get`, `justslide_workspaces_list`, `justslide_workspaces_create`, `justslide_tabs_list`, `justslide_tabs_create`, `justslide_tabs_pin`, `justslide_tabs_close`, `justslide_favorites_list`, `justslide_favorites_add`, `justslide_page_navigate`, `justslide_page_snapshot`, `justslide_page_screenshot`, `justslide_events_poll` (bridge side). Browser side: dispatcher authored for the first 12; `events.poll` pending. **None is runtime-tested against a native browser yet.**

### Tests
`cargo test` (10): registry/inlining, validator (activation, file:/javascript:/chrome: URLs, spoofed `actorId`, bounds), endpoint/token permission checks, and `tests/mcp_stdio.rs` — a protocol test client that spawns the real binary over stdio against a **BrowserTestDouble** (real AF_UNIX socket, framing, auth): tool filtering, create workspace + 3 background tabs + pin + favorite, screenshot image content, personal-tab invisibility, invalid calls never reach the browser, revocation, wrong token, no browser.

## Cursor configuration
Active `.cursor/mcp.json` contains only the public ADS docs server. A JustSlide entry example is in `docs/examples/cursor-mcp.justslide.json` — add it once a native build with automation exists. No auto-approval.

## Pairing (planned UI)
Sidebar agent menu → native pairing dialog → choose client name, workspaces/operations, expiry → token generated, shown once, offered to store in Keychain → grant appears in Agent activity with pause/revoke.

## Multiple instances
Each instance writes its own socket/instance id; endpoint.json always describes the most recent instance of that user-data dir; different user-data dirs are separate endpoints (`--user-data-dir`).

## Remote / cloud
Not in scope: a cloud ChatGPT session cannot reach a private local socket. Any relay needs separate design (E2E auth, explicit user opt-in, no default exposure). Nothing deployed.

## Native JustSlide plugins (planned)
Separate from WebExtensions and MCP: versioned manifests, declarative contributions (commands, sidebar entries, settings, themes), no third-party code in browser process or trusted WebUI.
