//! Protocol test client: spawns the real `justslide-mcp` binary and speaks MCP
//! JSON-RPC over its stdio, against the BrowserTestDouble endpoint.
mod support;
use serde_json::{Value, json};
use std::process::Stdio;
use std::sync::atomic::Ordering;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};

struct Mcp { child: Child, stdin: ChildStdin, out: tokio::io::Lines<BufReader<ChildStdout>>, next: i64 }

impl Mcp {
    async fn spawn(udd: &std::path::Path, token: &std::path::Path) -> Mcp {
        let mut child = Command::new(env!("CARGO_BIN_EXE_justslide-mcp"))
            .args(["--user-data-dir", udd.to_str().unwrap(), "--token-file", token.to_str().unwrap()])
            .env("RUST_LOG", "info")
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit())
            .kill_on_drop(true)
            .spawn().unwrap();
        let stdin = child.stdin.take().unwrap();
        let out = BufReader::new(child.stdout.take().unwrap()).lines();
        let mut m = Mcp { child, stdin, out, next: 1 };
        let init = m.request("initialize", json!({"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "justslide-protocol-test", "version": "0"}})).await;
        assert_eq!(init["result"]["serverInfo"]["name"], "justslide-mcp", "{init}");
        m.notify("notifications/initialized", json!({})).await;
        m
    }
    async fn send(&mut self, v: Value) { self.stdin.write_all(format!("{v}\n").as_bytes()).await.unwrap(); self.stdin.flush().await.unwrap(); }
    async fn notify(&mut self, method: &str, params: Value) { self.send(json!({"jsonrpc": "2.0", "method": method, "params": params})).await; }
    async fn request(&mut self, method: &str, params: Value) -> Value {
        let id = self.next; self.next += 1;
        self.send(json!({"jsonrpc": "2.0", "id": id, "method": method, "params": params})).await;
        loop {
            let line = tokio::time::timeout(std::time::Duration::from_secs(20), self.out.next_line()).await.expect("timeout").unwrap().expect("eof");
            // stdout must carry MCP JSON-RPC only.
            let v: Value = serde_json::from_str(&line).unwrap_or_else(|_| panic!("non-JSON on stdout: {line}"));
            assert_eq!(v["jsonrpc"], "2.0", "{line}");
            if v.get("id") == Some(&json!(id)) { return v; }
        }
    }
    async fn call(&mut self, tool: &str, args: Value) -> Value {
        let r = self.request("tools/call", json!({"name": tool, "arguments": args})).await;
        r["result"].clone()
    }
}

fn body(r: &Value) -> Value { r["structuredContent"].clone() }
fn is_err(r: &Value) -> bool { r["isError"] == json!(true) }

#[tokio::test(flavor = "multi_thread")]
async fn end_to_end_against_test_double() {
    let d = support::Double::start().await;
    let mut m = Mcp::spawn(&d.user_data_dir, &d.token_file).await;

    // Tools are filtered to what the "browser" says it implements.
    let tools = m.request("tools/list", json!({})).await;
    let names: Vec<String> = tools["result"]["tools"].as_array().unwrap().iter().map(|t| t["name"].as_str().unwrap().to_string()).collect();
    assert!(names.contains(&"justslide_tabs_create".to_string()));
    assert!(!names.contains(&"justslide_page_snapshot".to_string()), "not implemented by the double, must not be advertised: {names:?}");

    // Agent workspace + three background tabs, one pinned, plus a favorite.
    let ws = body(&m.call("justslide_workspaces_create", json!({"name": "Research"})).await)["result"]["workspace"].clone();
    let wsid = ws["id"].as_str().unwrap().to_string();
    let mut tab_ids = vec![];
    for u in ["https://example.com/a", "https://example.com/b", "https://example.com/c"] {
        let r = m.call("justslide_tabs_create", json!({"workspaceId": wsid, "url": u})).await;
        assert!(!is_err(&r), "{r}");
        let t = body(&r)["result"]["tab"].clone();
        assert_eq!(t["active"], false);
        tab_ids.push(t["id"].as_str().unwrap().to_string());
    }
    let pinned = m.call("justslide_tabs_pin", json!({"tabId": tab_ids[0], "pinned": true})).await;
    assert_eq!(body(&pinned)["result"]["tab"]["pinned"], true);
    assert!(!is_err(&m.call("justslide_favorites_add", json!({"url": "https://example.com/"})).await));

    // Screenshot of the specified agent tab returns image content.
    let shot = m.call("justslide_page_screenshot", json!({"tabId": tab_ids[1]})).await;
    assert_eq!(shot["content"][0]["type"], "image", "{shot}");

    // Personal state is not visible through the grant.
    let listed = body(&m.call("justslide_tabs_list", json!({})).await);
    assert!(!listed.to_string().contains("SECRET"), "{listed}");
    let denied = m.call("justslide_tabs_close", json!({"tabId": "tab_personal01"})).await;
    assert!(is_err(&denied));

    // Bridge-side validation: activation, non-http URLs and spoofed actor ids are rejected before the browser.
    let before = d.state.lock().await.seen_request_ids.len();
    for bad in [
        json!({"workspaceId": wsid, "url": "https://example.com", "activate": true}),
        json!({"workspaceId": wsid, "url": "file:///etc/passwd"}),
        json!({"workspaceId": wsid, "url": "https://example.com", "actorId": "user"}),
    ] {
        let r = m.call("justslide_tabs_create", bad).await;
        assert!(is_err(&r) && body(&r)["error"]["code"] == "invalid_argument", "{r}");
    }
    assert_eq!(d.state.lock().await.seen_request_ids.len(), before, "invalid calls must not reach the browser");

    // Unsupported tool (snapshot not implemented by this build).
    let r = m.call("justslide_page_snapshot", json!({"tabId": tab_ids[0]})).await;
    assert_eq!(body(&r)["error"]["code"], "unsupported", "{r}");

    // Revocation: subsequent operations fail.
    d.revoked.store(true, Ordering::SeqCst);
    let r = m.call("justslide_tabs_create", json!({"workspaceId": wsid, "url": "https://example.com/d"})).await;
    assert!(is_err(&r));
    assert_eq!(body(&r)["error"]["code"], "permission_denied", "{r}");

    // The human's active tab was never touched.
    let g = d.state.lock().await;
    assert_eq!(g.human_active_tab, "tab_personal01");
    assert!(g.tabs.iter().any(|t| t["id"] == "tab_personal01" && t["active"] == true));
    drop(g);
    let _ = m.child.kill().await;
}

#[tokio::test(flavor = "multi_thread")]
async fn wrong_token_is_refused_and_only_capabilities_tool_is_listed() {
    let d = support::Double::start().await;
    let bad = d.dir.path().join("bad");
    std::fs::write(&bad, "b".repeat(50)).unwrap();
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&bad, std::fs::Permissions::from_mode(0o600)).unwrap();
    let mut m = Mcp::spawn(&d.user_data_dir, &bad).await;
    let tools = m.request("tools/list", json!({})).await;
    let names: Vec<&str> = tools["result"]["tools"].as_array().unwrap().iter().map(|t| t["name"].as_str().unwrap()).collect();
    assert_eq!(names, vec!["justslide_capabilities_get"]);
    let r = m.call("justslide_capabilities_get", json!({})).await;
    assert_eq!(body(&r)["error"]["code"], "unavailable", "{r}");
    assert!(r.to_string().contains("refused"), "{r}");
    let _ = m.child.kill().await;
}

#[tokio::test(flavor = "multi_thread")]
async fn no_browser_running_fails_honestly() {
    let dir = tempfile::tempdir().unwrap();
    let tok = dir.path().join("t");
    std::fs::write(&tok, "a".repeat(50)).unwrap();
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&tok, std::fs::Permissions::from_mode(0o600)).unwrap();
    let mut m = Mcp::spawn(dir.path(), &tok).await;
    let r = m.call("justslide_tabs_list", json!({})).await;
    assert_eq!(body(&r)["error"]["code"], "unavailable", "{r}");
    let _ = m.child.kill().await;
}
