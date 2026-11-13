# ADR 0005 — Local MCP transport
**Status:** accepted
**Decision:** A small Rust `justslide-mcp` (rmcp 3.9, stdio) translates MCP to a separately versioned, bounded JSON protocol over an authenticated AF_UNIX socket (peer-uid check + pairing token, endpoint discovery file). No CDP, no TCP/localhost ports, no exposure of internal Mojo. The bridge never launches a browser or holds state.
**Why:** Cursor/desktop clients speak stdio MCP; the browser stays authoritative; transport can be replaced (e.g. future remote relay) without touching browser semantics.
