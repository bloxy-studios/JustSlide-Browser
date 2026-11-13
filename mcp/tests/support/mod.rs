//! BrowserTestDouble: an in-memory stand-in for the JustSlide browser's local
//! automation endpoint, used ONLY to test the MCP bridge's transport, framing,
//! authentication, filtering, error mapping, cancellation and revocation
//! behaviour. It is not the browser and proves nothing about native behaviour.

#![allow(dead_code)]
use serde_json::{Value, json};
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::Mutex;

pub const TOKEN: &str = "test-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
pub const INSTANCE: &str = "inst_testdouble01";

#[derive(Default)]
pub struct State {
    pub tabs: Vec<Value>,
    pub workspaces: Vec<Value>,
    pub favorites: Vec<Value>,
    pub human_active_tab: String,
    pub seq: u64,
    pub revision: i64,
    pub seen_request_ids: Vec<String>,
    pub cancelled: Vec<String>,
}

pub struct Double {
    pub dir: tempfile::TempDir,
    pub user_data_dir: PathBuf,
    pub token_file: PathBuf,
    pub state: Arc<Mutex<State>>,
    pub revoked: Arc<AtomicBool>,
}

fn chmod(p: &Path, m: u32) { std::fs::set_permissions(p, std::fs::Permissions::from_mode(m)).unwrap(); }

pub const IMPLEMENTED: &[&str] = &[
    "capabilities.get", "workspaces.list", "workspaces.create", "tabs.list", "tabs.create",
    "tabs.pin", "tabs.close", "favorites.list", "favorites.add", "page.screenshot",
];

impl Double {
    pub async fn start() -> Double {
        let dir = tempfile::tempdir().unwrap();
        let udd = dir.path().join("udd");
        let auto = udd.join("JustSlideAutomation");
        std::fs::create_dir_all(&auto).unwrap();
        chmod(&auto, 0o700);
        let sock = auto.join("s.sock");
        let listener = UnixListener::bind(&sock).unwrap();
        chmod(&sock, 0o600);
        let ep = auto.join("endpoint.json");
        std::fs::write(&ep, json!({"protocol": "app.justslide.local-automation", "protocolVersion": "1.0.0", "instanceId": INSTANCE, "socket": sock, "pid": std::process::id()}).to_string()).unwrap();
        chmod(&ep, 0o600);
        let token_file = dir.path().join("token");
        std::fs::write(&token_file, TOKEN).unwrap();
        chmod(&token_file, 0o600);

        let state = Arc::new(Mutex::new(State {
            workspaces: vec![
                json!({"id": "ws_personal01", "name": "Personal", "icon": "personal", "profileKind": "personal", "agentOwned": false}),
            ],
            tabs: vec![json!({"id": "tab_personal01", "workspaceId": "ws_personal01", "url": "http://127.0.0.1/typing.html", "title": "SECRET personal tab", "pinned": false, "loading": false, "active": true, "openedBy": "user"})],
            human_active_tab: "tab_personal01".into(),
            ..Default::default()
        }));
        let revoked = Arc::new(AtomicBool::new(false));
        let (st, rv) = (state.clone(), revoked.clone());
        tokio::spawn(async move {
            loop {
                let Ok((s, _)) = listener.accept().await else { break };
                tokio::spawn(serve(s, st.clone(), rv.clone()));
            }
        });
        Double { dir, user_data_dir: udd, token_file, state, revoked }
    }
}

async fn read(s: &mut UnixStream) -> Option<Value> {
    let n = s.read_u32().await.ok()? as usize;
    if n > 65536 { return None; }
    let mut b = vec![0; n];
    s.read_exact(&mut b).await.ok()?;
    serde_json::from_slice(&b).ok()
}
async fn write(s: &mut UnixStream, v: &Value) {
    let b = serde_json::to_vec(v).unwrap();
    s.write_u32(b.len() as u32).await.unwrap();
    s.write_all(&b).await.unwrap();
}

fn err(id: &str, code: &str, msg: &str) -> Value {
    json!({"v": 1, "id": id, "ok": false, "error": {"code": code, "message": msg, "retryable": false}})
}

async fn serve(mut s: UnixStream, st: Arc<Mutex<State>>, revoked: Arc<AtomicBool>) {
    let Some(hello) = read(&mut s).await else { return };
    let token_ok = hello["hello"]["pairingToken"].as_str() == Some(TOKEN);
    if !token_ok || revoked.load(Ordering::SeqCst) {
        write(&mut s, &json!({"v": 1, "error": {"code": "unauthenticated", "message": "pairing not recognised or revoked"}})).await;
        return;
    }
    // Identity comes from the pairing record, never from the client.
    let grant_ws: Vec<String> = vec![];
    let grant_ws = Arc::new(Mutex::new(grant_ws));
    write(&mut s, &json!({"v": 1, "welcome": {"instanceId": INSTANCE, "protocolVersion": "1.0.0", "grantId": "grant_test01", "commands": IMPLEMENTED}})).await;
    while let Some(req) = read(&mut s).await {
        if let Some(c) = req.get("cancel").and_then(Value::as_str) {
            st.lock().await.cancelled.push(c.to_string());
            continue;
        }
        let id = req["id"].as_str().unwrap_or("").to_string();
        if revoked.load(Ordering::SeqCst) {
            write(&mut s, &err(&id, "permission_denied", "grant revoked")).await;
            continue;
        }
        let cmd = req["command"].as_str().unwrap_or("");
        let a = &req["args"];
        let mut g = st.lock().await;
        g.seen_request_ids.push(id.clone());
        let granted = grant_ws.lock().await.clone();
        let in_grant = |ws: &str| granted.iter().any(|w| w == ws);
        let reply = match cmd {
            "capabilities.get" => ok(&mut g, &id, json!({"protocolVersion": "1.0.0", "instanceId": INSTANCE, "commands": IMPLEMENTED, "grant": {"grantId": "grant_test01", "workspaces": granted, "operations": ["read.metadata", "write.organize", "read.capture"], "paused": false}})),
            "workspaces.list" => { let w: Vec<Value> = g.workspaces.iter().filter(|w| in_grant(w["id"].as_str().unwrap())).cloned().collect(); ok(&mut g, &id, json!({"workspaces": w})) }
            "workspaces.create" => {
                let n = g.workspaces.len();
                let w = json!({"id": format!("ws_agent{n:04}"), "name": a["name"], "icon": a.get("icon").cloned().unwrap_or(json!("agent")), "profileKind": "agent-isolated", "agentOwned": true});
                g.workspaces.push(w.clone());
                grant_ws.lock().await.push(w["id"].as_str().unwrap().to_string());
                ok(&mut g, &id, json!({"workspace": w}))
            }
            "tabs.list" => { let t: Vec<Value> = g.tabs.iter().filter(|t| in_grant(t["workspaceId"].as_str().unwrap())).cloned().collect(); ok(&mut g, &id, json!({"tabs": t})) }
            "tabs.create" => {
                let ws = a["workspaceId"].as_str().unwrap_or("");
                if !in_grant(ws) { err(&id, "permission_denied", "workspace not in grant") } else {
                    let n = g.tabs.len();
                    let t = json!({"id": format!("tab_agent{n:04}"), "workspaceId": ws, "url": a["url"], "title": "", "pinned": a.get("pinned").cloned().unwrap_or(json!(false)), "loading": true, "active": false, "openedBy": "agent"});
                    g.tabs.push(t.clone());
                    ok(&mut g, &id, json!({"tab": t}))
                }
            }
            "tabs.pin" | "tabs.close" | "page.screenshot" => {
                let tid = a["tabId"].as_str().unwrap_or("");
                let pos = g.tabs.iter().position(|t| t["id"] == tid);
                match pos {
                    None => err(&id, "not_found", "no such tab"),
                    Some(i) if !in_grant(g.tabs[i]["workspaceId"].as_str().unwrap()) => err(&id, "not_found", "no such tab"),
                    Some(i) => match cmd {
                        "tabs.pin" => { g.tabs[i]["pinned"] = a["pinned"].clone(); let t = g.tabs[i].clone(); ok(&mut g, &id, json!({"tab": t})) }
                        "tabs.close" => { g.tabs.remove(i); ok(&mut g, &id, json!({"closed": true})) }
                        _ => ok(&mut g, &id, json!({"tabId": tid, "mimeType": "image/png", "dataBase64": "iVBORw0KGgo=", "width": 1, "height": 1, "navigationId": "nav_1"})),
                    },
                }
            }
            "favorites.list" => { let f = g.favorites.clone(); ok(&mut g, &id, json!({"favorites": f})) }
            "favorites.add" => { let f = json!({"id": format!("fav_{:08}", g.favorites.len()), "url": a["url"], "title": a.get("title").cloned().unwrap_or(json!(""))}); g.favorites.push(f.clone()); ok(&mut g, &id, json!({"favorite": f})) }
            _ => err(&id, "unknown_command", "not implemented by this build"),
        };
        drop(g);
        write(&mut s, &reply).await;
    }
}

fn ok(g: &mut State, id: &str, result: Value) -> Value {
    g.revision += 1;
    json!({"v": 1, "id": id, "ok": true, "result": result, "revision": g.revision})
}
