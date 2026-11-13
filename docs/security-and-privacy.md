# Security & privacy

## Threat model (local)
| Adversary | Goal | Controls |
|---|---|---|
| Malicious web page / iframe / popup | Reach privileged handlers, read other tabs, instruct agents | Mojo bound only `ForWebUI<JustSlideSidebarUI>`; no `chrome.send` (`enable_chrome_send=false`); `.top-chrome` sidebar inert in tabs (no owning window → `ReportBadMessage`); `frame-ancestors 'none'`; page text = untrusted data; fixture `tests/fixtures/pages/hostile.html` |
| Compromised sidebar renderer | Abuse PageHandler | Browser validates ids/lengths/colors; unknown ids ignored; bad input → bad-message kill; no file/process APIs; CSP + Trusted Types (exact glyph allowlist) + `connect-src 'none'` |
| Other local user | Connect to automation | AF_UNIX in 0700 dir, 0600 socket; peer uid check; token |
| Same-user process without token | Drive browser | Pairing token (32 random bytes, SHA-256 at rest, constant-time compare); grants scoped; **limit:** same-user malware can read user files/Keychain prompts — local-process trust is bounded, documented |
| Paired but over-reaching agent | Read personal tabs, act on human's page | Grants per workspace + operation; personal workspaces excluded by default; agent workspaces in isolated profile; human-active tab → `user_interaction_required`; no activation in v1 |
| Prompt injection via page content | Make agent exfiltrate | Tools return data only; bridge instructions mark content untrusted; sensitive ops need per-action human approval (planned `write.sensitive`). No immunity claimed. |
| Extension | Read workspace-hidden tabs | Not prevented: extensions are profile-scoped. UI hiding ≠ sandbox. Powerful extensions never installed into the personal profile under a workspace grant. |

## Grants
Created only by the human in trusted UI (pairing dialog). Scopes: workspaces × operations (`read.metadata`, `write.organize`, `read.content`, `read.capture`, `write.navigate`; planned `write.interact`, `write.sensitive`). Revalidated on every request; pause blocks; revoke blocks future requests, cancels cancellable work, cannot undo completed actions. Expiry supported.

## Sensitive actions
Downloads, file choosers, auth, permission prompts, dialogs and popups from agent tabs become **pending requests** in the authorized workspace (visible in the agent card) and never take keyboard focus. Approval is per request, bound to target + operation, revalidated before execution. User intervention wins; stale clicks are not replayed.

## Chromium protections preserved
Sandbox, site isolation, TLS, normal permission prompts, Safe Browsing UI (service availability: see licensing doc), no `--no-sandbox`, no `--disable-web-security`, no CDP/remote-debugging port, no broad origin exceptions.

## Privacy defaults
No new telemetry, analytics, sync or AI uploads. Logs redact URLs beyond origin and never include tokens, page bodies, screenshots or password fields. AX snapshots redact `kProtected` nodes. Private windows: own WorkspaceService instance; grants never apply to OTR profiles. Upstream network inventory (component updater, Safe Browsing, variations, etc.) to be measured on the baseline build (`testing-and-performance.md`).

## Required review
Mojo IPC review for `justslide_shell.mojom`; security review of the automation socket before enabling `JustSlideLocalAutomation` by default.
