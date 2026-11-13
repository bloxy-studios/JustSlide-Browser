//! Loads the canonical protocol registry (compiled in, so it cannot drift from
//! protocol/registry/justslide.protocol.v1.json) and converts command specs
//! into MCP tool definitions with `$ref`s inlined.

use serde_json::{Map, Value};
use std::sync::{Arc, OnceLock};

pub const REGISTRY_JSON: &str =
    include_str!("../../protocol/registry/justslide.protocol.v1.json");

#[derive(Debug, Clone)]
pub struct CommandSpec {
    pub name: String,
    pub mcp_tool: String,
    pub title: String,
    pub description: String,
    pub operation: Option<String>,
    pub idempotency: String,
    pub arguments: Value,
    pub result: Value,
}

#[derive(Debug)]
pub struct Registry {
    pub raw: Value,
    pub version: String,
    pub commands: Vec<CommandSpec>,
}

impl Registry {
    pub fn get() -> &'static Registry {
        static REG: OnceLock<Registry> = OnceLock::new();
        REG.get_or_init(|| Registry::parse(REGISTRY_JSON).expect("embedded registry is valid"))
    }

    pub fn parse(text: &str) -> anyhow::Result<Registry> {
        let raw: Value = serde_json::from_str(text)?;
        let defs = raw["definitions"].clone();
        let mut commands = Vec::new();
        for c in raw["commands"].as_array().ok_or_else(|| anyhow::anyhow!("commands missing"))? {
            let s = |k: &str| c[k].as_str().unwrap_or_default().to_string();
            commands.push(CommandSpec {
                name: s("name"),
                mcp_tool: s("mcpTool"),
                title: s("title"),
                description: s("description"),
                operation: c["operation"].as_str().map(str::to_string),
                idempotency: s("idempotency"),
                arguments: inline_refs(&c["arguments"], &defs, 0)?,
                result: inline_refs(&c["result"], &defs, 0)?,
            });
        }
        Ok(Registry { version: raw["version"].as_str().unwrap_or_default().to_string(), raw, commands })
    }

    pub fn by_tool(&self, tool: &str) -> Option<&CommandSpec> {
        self.commands.iter().find(|c| c.mcp_tool == tool)
    }

    pub fn by_command(&self, name: &str) -> Option<&CommandSpec> {
        self.commands.iter().find(|c| c.name == name)
    }

    pub fn max_frame_bytes(&self) -> usize {
        self.raw["framing"]["maxFrameBytes"].as_u64().unwrap_or(65536) as usize
    }

    pub fn max_result_frame_bytes(&self) -> usize {
        self.raw["framing"]["maxResultFrameBytes"].as_u64().unwrap_or(8 << 20) as usize
    }

    pub fn request_timeout_ms(&self) -> u64 {
        self.raw["limits"]["requestTimeoutMs"].as_u64().unwrap_or(30_000)
    }
}

fn inline_refs(v: &Value, defs: &Value, depth: usize) -> anyhow::Result<Value> {
    anyhow::ensure!(depth < 16, "schema $ref nesting too deep");
    Ok(match v {
        Value::Object(m) => {
            if let Some(Value::String(r)) = m.get("$ref") {
                let key = r.strip_prefix("#/definitions/").ok_or_else(|| anyhow::anyhow!("bad $ref {r}"))?;
                let target = defs.get(key).ok_or_else(|| anyhow::anyhow!("unknown $ref {r}"))?;
                return inline_refs(target, defs, depth + 1);
            }
            let mut out = Map::new();
            for (k, val) in m {
                out.insert(k.clone(), inline_refs(val, defs, depth + 1)?);
            }
            Value::Object(out)
        }
        Value::Array(a) => Value::Array(a.iter().map(|x| inline_refs(x, defs, depth + 1)).collect::<Result<_, _>>()?),
        other => other.clone(),
    })
}

pub fn as_json_object(v: &Value) -> Arc<Map<String, Value>> {
    Arc::new(v.as_object().cloned().unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_registry_parses_and_inlines_refs() {
        let r = Registry::get();
        assert_eq!(r.version, "1.0.0");
        assert!(r.commands.len() >= 13);
        let create = r.by_tool("justslide_tabs_create").unwrap();
        assert_eq!(create.name, "tabs.create");
        assert!(!create.arguments.to_string().contains("$ref"));
        assert_eq!(create.arguments["properties"]["activate"]["const"], Value::Bool(false));
        for c in &r.commands {
            assert!(c.mcp_tool.starts_with("justslide_"), "{}", c.mcp_tool);
            assert!(c.mcp_tool.len() <= 64);
            assert!(c.mcp_tool.chars().all(|ch| ch.is_ascii_lowercase() || ch == '_'));
        }
    }
}
