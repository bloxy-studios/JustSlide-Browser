# Data & protocol

## IDs
| Entity | Format | Lifetime | Never |
|---|---|---|---|
| Workspace | `ws_<base32>` | durable (prefs) | — |
| Tab | `tab_<base32>` | durable across restart via NavigationEntry extended info | tab index, SessionID, TabHandle, renderer pid |
| Favorite | `fav_<uuid12>` | durable (bookmark uuid) | — |
| Grant | `grant_<base32>` | until revoked | caller-supplied |
| Navigation | `nav_<n>` per tab | per committed main-frame navigation | — |
| Instance | `inst_<base32>` | per browser run | — |

Reconciliation: restored tab → id from extended info; duplicate/cloned tab sharing an id → first keeps it, second gets a new id; popups/extension tabs → opener's/selected workspace; cross-window move keeps id; discard keeps WebContents identity; renderer crash → `crashed=true`, same id; failed navigation → `hasError`.

## Persistence (profile prefs, schema v1)
`justslide.workspaces {version:1, items:[{id,name,icon,agent_owned}]}`, `justslide.selected_workspace`, `justslide.color_mode`, `justslide.backdrop_color`, `justslide.sidebar_collapsed`, `justslide.automation.grants {grant_id:{client, token_sha256, workspaces[], operations[], paused, revoked, expires}}`. Unknown versions are ignored (forward-safe); migrations add `vN→vN+1` in `WorkspaceService::Load`. Private (OTR) profiles get their own service instance and never write regular prefs.

## External protocol
Canonical: `protocol/registry/justslide.protocol.v1.json` (13 commands, 7 events, 15 error codes, limits). Generated: `protocol/generated/protocol.ts`, `browser/integration/justslide/automation/protocol_constants.h`; the Rust bridge embeds the JSON. `bun run protocol:check` fails on drift.

* Framing: u32 BE length + UTF-8 JSON, ≤64 KiB in, ≤8 MiB results.
* Handshake: `hello{client, clientVersion, pairingToken, expectInstanceId}` → `welcome{instanceId, protocolVersion, grantId, commands}` or `error`.
* Request: `{v:1, id, command, args, precondition?{revision, navigationId, url}}`; cancel: `{v:1, cancel:id}`.
* Response: `{v:1, id, ok:true, result, revision}` | `{v:1, id, ok:false, error{code, message, retryable, pendingRequestId?}}`.
* Events: `{v:1, seq, event, data}`; clients resync with `events.poll{afterSeq}`; `resyncRequired` on gaps/overflow (queue ≤1024).
* Idempotency: `safe` / `idempotent` / `request-id` (dedupe per grant) / `non-idempotent` (never auto-retried).
* Errors outside grant scope return `not_found` (no existence leaks).

## Internal (WebUI) protocol
`browser/integration/justslide/webui/justslide_shell.mojom`: full `ShellSnapshot` push (revisioned, debounced), intents only. Drift-tested against `ui/browser-chrome/src/bridge/types.ts`.
