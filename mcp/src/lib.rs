//! justslide-mcp: a thin local stdio MCP transport adapter for JustSlide.
//! It owns MCP session negotiation only; the running browser owns all state,
//! authorization and validation.
pub mod client;
pub mod endpoint;
pub mod registry;
pub mod server;
pub mod validate;
