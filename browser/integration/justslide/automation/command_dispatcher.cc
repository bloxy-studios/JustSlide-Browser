// Copyright 2026 Bloxy Studios.
#include "justslide/automation/command_dispatcher.h"

#include "base/base64.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/browser_window/public/browser_window_interface.h"
#include "chrome/browser/ui/browser_window/public/global_browser_collection.h"
#include "chrome/browser/ui/tabs/tab_strip_model.h"
#include "content/public/browser/web_contents.h"
#include "justslide/automation/protocol_constants.h"
#include "justslide/browser/background_tab_ops.h"
#include "justslide/browser/tab_identity.h"
#include "justslide/browser/workspace_service.h"
#include "ui/gfx/codec/png_codec.h"

namespace justslide {
namespace p = protocol;
namespace {

base::Value::Dict Error(const std::string& id, const char* code, std::string msg, bool retryable = false) {
  return base::Value::Dict().Set("v", 1).Set("id", id).Set("ok", false)
      .Set("error", base::Value::Dict().Set("code", code).Set("message", std::move(msg)).Set("retryable", retryable));
}
base::Value::Dict Ok(const std::string& id, base::Value::Dict result, int64_t revision) {
  return base::Value::Dict().Set("v", 1).Set("id", id).Set("ok", true).Set("result", std::move(result)).Set("revision", double(revision));
}
bool Allowed(const Grant& g, const char* op) { return g.operations.contains(op); }
GURL HttpUrl(const base::Value::Dict& a, const char* key) {
  const std::string* s = a.FindString(key);
  GURL u = s && s->size() <= 8192 ? GURL(*s) : GURL();
  return u.is_valid() && u.SchemeIsHTTPOrHTTPS() ? u : GURL();
}
// Finds a tab by durable id among windows of the agent profile only.
std::pair<BrowserWindowInterface*, int> FindTab(Profile* profile, const std::string& tab_id) {
  std::pair<BrowserWindowInterface*, int> found{nullptr, -1};
  GlobalBrowserCollection::GetInstance()->ForEach([&](BrowserWindowInterface* w) {
    if (w->GetProfile() != profile) return true;
    TabStripModel* m = w->GetTabStripModel();
    for (int i = 0; i < m->count(); ++i) {
      auto* id = TabIdentity::FromWebContents(m->GetWebContentsAt(i));
      if (id && id->tab_id() == tab_id) { found = {w, i}; return false; }
    }
    return true;
  });
  return found;
}
base::Value::Dict TabJson(content::WebContents* wc, TabStripModel* m, int i) {
  auto* id = TabIdentity::FromWebContents(wc);
  static const char* kBy[] = {"user", "agent", "extension", "restore", "popup"};
  return base::Value::Dict().Set("id", id->tab_id()).Set("workspaceId", id->workspace_id())
      .Set("url", wc->GetVisibleURL().spec()).Set("title", base::UTF16ToUTF8(wc->GetTitle()).substr(0, 512))
      .Set("pinned", m->IsTabPinned(i)).Set("loading", wc->IsLoading()).Set("active", m->active_index() == i)
      .Set("openedBy", kBy[static_cast<int>(id->opened_by())]).Set("navigationId", id->navigation_id())
      .Set("crashed", wc->IsCrashed()).Set("audible", wc->IsCurrentlyAudible());
}
int64_t g_revision = 0;
}  // namespace

CommandDispatcher::CommandDispatcher(Profile* profile, GrantStore* grants) : profile_(profile), grants_(grants) {}
CommandDispatcher::~CommandDispatcher() = default;

// static
std::vector<std::string> CommandDispatcher::ImplementedCommands() {
  return {p::kCmdCapabilitiesGet, p::kCmdWorkspacesList, p::kCmdWorkspacesCreate, p::kCmdTabsList,
          p::kCmdTabsCreate, p::kCmdTabsPin, p::kCmdTabsClose, p::kCmdFavoritesList, p::kCmdFavoritesAdd,
          p::kCmdPageNavigate, p::kCmdPageScreenshot, p::kCmdPageSnapshot};
}

void CommandDispatcher::Dispatch(const Grant& grant, const base::Value::Dict& req, Reply reply) {
  const std::string id = *req.FindString("id");
  const std::string cmd = *req.FindString("command");
  const base::Value::Dict& a = *req.FindDict("args");
  if (grant.paused) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "grant is paused by the user", true));
  if (auto it = recent_results_.find(grant.grant_id + "/" + id); it != recent_results_.end())
    return std::move(reply).Run(it->second.Clone());  // request-id idempotency
  WorkspaceService* ws = WorkspaceService::Get(profile_);
  auto in_grant = [&](const std::string& w) { return grant.workspace_ids.contains(w); };

  if (cmd == p::kCmdCapabilitiesGet) {
    base::Value::List cmds; for (auto& c : ImplementedCommands()) cmds.Append(c);
    base::Value::List wss; for (auto& w : grant.workspace_ids) wss.Append(w);
    base::Value::List ops; for (auto& o : grant.operations) ops.Append(o);
    return std::move(reply).Run(Ok(id, base::Value::Dict().Set("protocolVersion", p::kProtocolVersion)
        .Set("commands", std::move(cmds)).Set("grant", base::Value::Dict().Set("grantId", grant.grant_id)
        .Set("workspaces", std::move(wss)).Set("operations", std::move(ops)).Set("paused", grant.paused)), g_revision));
  }
  if (cmd == p::kCmdWorkspacesCreate) {
    if (!Allowed(grant, p::kOpWriteOrganize)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "write.organize not granted"));
    const std::string* name = a.FindString("name");
    if (!name || name->empty() || name->size() > 64) return std::move(reply).Run(Error(id, p::kErrInvalidArgument, "name"));
    const Workspace& w = ws->Create(*name, WorkspaceIcon::kAgent, /*agent_owned=*/true);
    grants_->AddWorkspace(grant.grant_id, w.id);
    auto r = Ok(id, base::Value::Dict().Set("workspace", base::Value::Dict().Set("id", w.id).Set("name", w.name)
        .Set("icon", "agent").Set("profileKind", "agent-isolated").Set("agentOwned", true)), ++g_revision);
    recent_results_[grant.grant_id + "/" + id] = r.Clone();
    return std::move(reply).Run(std::move(r));
  }
  if (cmd == p::kCmdTabsCreate) {
    if (!Allowed(grant, p::kOpWriteOrganize)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "write.organize not granted"));
    const std::string* wid = a.FindString("workspaceId");
    GURL url = HttpUrl(a, "url");
    if (!wid || !in_grant(*wid)) return std::move(reply).Run(Error(id, p::kErrNotFound, "workspace not found"));
    if (!url.is_valid()) return std::move(reply).Run(Error(id, p::kErrInvalidArgument, "url must be http(s)"));
    if (a.FindBool("activate").value_or(false)) return std::move(reply).Run(Error(id, p::kErrInvalidArgument, "activation is not allowed"));
    // Agent workspaces live in the agent profile's own window, which is
    // created without activation if needed (see automation_server.cc).
    BrowserWindowInterface* target = nullptr;
    GlobalBrowserCollection::GetInstance()->ForEach([&](BrowserWindowInterface* w) {
      if (w->GetProfile() == profile_) { target = w; return false; } return true; });
    if (!target) return std::move(reply).Run(Error(id, p::kErrUnavailable, "no agent window", true));
    content::WebContents* wc = OpenBackgroundTab(target, url, a.FindBool("pinned").value_or(false), *wid);
    if (!wc) return std::move(reply).Run(Error(id, p::kErrInternal, "could not open tab"));
    TabStripModel* m = target->GetTabStripModel();
    auto r = Ok(id, base::Value::Dict().Set("tab", TabJson(wc, m, m->GetIndexOfWebContents(wc))), ++g_revision);
    recent_results_[grant.grant_id + "/" + id] = r.Clone();
    return std::move(reply).Run(std::move(r));
  }
  if (cmd == p::kCmdTabsList) {
    if (!Allowed(grant, p::kOpReadMetadata)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "read.metadata not granted"));
    base::Value::List tabs;
    GlobalBrowserCollection::GetInstance()->ForEach([&](BrowserWindowInterface* w) {
      if (w->GetProfile() != profile_) return true;
      TabStripModel* m = w->GetTabStripModel();
      for (int i = 0; i < m->count(); ++i) {
        auto* tid = TabIdentity::FromWebContents(m->GetWebContentsAt(i));
        if (tid && in_grant(tid->workspace_id())) tabs.Append(TabJson(m->GetWebContentsAt(i), m, i));
      }
      return true;
    });
    return std::move(reply).Run(Ok(id, base::Value::Dict().Set("tabs", std::move(tabs)), g_revision));
  }
  if (cmd == p::kCmdTabsPin || cmd == p::kCmdTabsClose || cmd == p::kCmdPageScreenshot || cmd == p::kCmdPageNavigate || cmd == p::kCmdPageSnapshot) {
    const std::string* tid = a.FindString("tabId");
    auto [w, i] = tid ? FindTab(profile_, *tid) : std::pair<BrowserWindowInterface*, int>{nullptr, -1};
    content::WebContents* wc = w ? w->GetTabStripModel()->GetWebContentsAt(i) : nullptr;
    if (!wc || !in_grant(TabIdentity::FromWebContents(wc)->workspace_id())) return std::move(reply).Run(Error(id, p::kErrNotFound, "tab not found"));
    TabStripModel* m = w->GetTabStripModel();
    const bool human_active = m->active_index() == i && w->IsActive();
    if (cmd == p::kCmdTabsPin) {
      if (!Allowed(grant, p::kOpWriteOrganize)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "write.organize not granted"));
      int ni = m->SetTabPinned(i, a.FindBool("pinned").value_or(false));
      return std::move(reply).Run(Ok(id, base::Value::Dict().Set("tab", TabJson(wc, m, ni)), ++g_revision));
    }
    if (cmd == p::kCmdTabsClose) {
      if (!Allowed(grant, p::kOpWriteOrganize)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "write.organize not granted"));
      if (human_active || TabIdentity::FromWebContents(wc)->opened_by() != OpenedBy::kAgent)
        return std::move(reply).Run(Error(id, p::kErrUserInteractionRequired, "only agent-opened background tabs can be closed"));
      m->CloseWebContentsAt(i, TabCloseTypes::CLOSE_CREATE_HISTORICAL_TAB);
      return std::move(reply).Run(Ok(id, base::Value::Dict().Set("closed", true), ++g_revision));
    }
    if (cmd == p::kCmdPageNavigate) {
      if (!Allowed(grant, p::kOpWriteNavigate)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "write.navigate not granted"));
      if (human_active) return std::move(reply).Run(Error(id, p::kErrUserInteractionRequired, "tab is in use by the person"));
      GURL url = HttpUrl(a, "url");
      if (!url.is_valid()) return std::move(reply).Run(Error(id, p::kErrInvalidArgument, "url must be http(s)"));
      wc->GetController().LoadURL(url, content::Referrer(), ui::PAGE_TRANSITION_AUTO_TOPLEVEL, std::string());
      return std::move(reply).Run(Ok(id, base::Value::Dict().Set("tab", TabJson(wc, m, i)), ++g_revision));
    }
    if (cmd == p::kCmdPageScreenshot) {
      if (!Allowed(grant, p::kOpReadCapture)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "read.capture not granted"));
      int edge = std::clamp(a.FindInt("maxEdgePx").value_or(1280), 64, p::kMaxScreenshotEdgePx);
      std::string nav = TabIdentity::FromWebContents(wc)->navigation_id();
      CaptureTab(wc, edge, base::BindOnce([](std::string id, std::string tab, std::string nav, Reply reply, const SkBitmap& bmp) {
        if (bmp.drawsNothing()) return std::move(reply).Run(Error(id, p::kErrUnsupported, "tab cannot be rendered in the background right now", true));
        auto png = gfx::PNGCodec::EncodeBGRASkBitmap(bmp, /*discard_transparency=*/true);
        if (!png) return std::move(reply).Run(Error(id, p::kErrInternal, "encode failed"));
        std::move(reply).Run(Ok(id, base::Value::Dict().Set("tabId", tab).Set("mimeType", "image/png")
            .Set("dataBase64", base::Base64Encode(*png)).Set("width", bmp.width()).Set("height", bmp.height())
            .Set("navigationId", nav), g_revision));
      }, id, *tid, nav, std::move(reply)));
      return;
    }
    if (cmd == p::kCmdPageSnapshot) {
      if (!Allowed(grant, p::kOpReadContent)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "read.content not granted"));
      size_t max = std::clamp(a.FindInt("maxNodes").value_or(500), 1, p::kMaxSnapshotNodes);
      SnapshotTab(wc, max, base::BindOnce([](std::string id, std::string tab, std::string url, std::string nav, Reply reply,
                                             std::vector<SnapshotNode> nodes, bool truncated) {
        base::Value::List l;
        for (auto& n : nodes) l.Append(base::Value::Dict().Set("role", n.role).Set("name", n.name).Set("depth", n.depth));
        std::move(reply).Run(Ok(id, base::Value::Dict().Set("tabId", tab).Set("url", url).Set("navigationId", nav)
            .Set("truncated", truncated).Set("nodes", std::move(l)), g_revision));
      }, id, *tid, wc->GetVisibleURL().spec(), TabIdentity::FromWebContents(wc)->navigation_id(), std::move(reply)));
      return;
    }
  }
  if (cmd == p::kCmdFavoritesAdd) {
    if (!Allowed(grant, p::kOpWriteOrganize)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "write.organize not granted"));
    const std::string* t = a.FindString("title");
    auto f = ws->AddFavorite(HttpUrl(a, "url"), t ? base::UTF8ToUTF16(*t) : u"");
    if (!f) return std::move(reply).Run(Error(id, p::kErrInvalidArgument, "url must be http(s)"));
    return std::move(reply).Run(Ok(id, base::Value::Dict().Set("favorite", base::Value::Dict().Set("id", f->id)
        .Set("url", f->url.spec()).Set("title", base::UTF16ToUTF8(f->title))), ++g_revision));
  }
  if (cmd == p::kCmdFavoritesList || cmd == p::kCmdWorkspacesList) {
    if (!Allowed(grant, p::kOpReadMetadata)) return std::move(reply).Run(Error(id, p::kErrPermissionDenied, "read.metadata not granted"));
    base::Value::List l;
    if (cmd == p::kCmdFavoritesList) {
      for (auto& f : ws->GetFavorites()) l.Append(base::Value::Dict().Set("id", f.id).Set("url", f.url.spec()).Set("title", base::UTF16ToUTF8(f.title)));
      return std::move(reply).Run(Ok(id, base::Value::Dict().Set("favorites", std::move(l)), g_revision));
    }
    for (auto& w : ws->workspaces()) if (in_grant(w.id))
      l.Append(base::Value::Dict().Set("id", w.id).Set("name", w.name).Set("icon", "agent").Set("profileKind", "agent-isolated").Set("agentOwned", w.agent_owned));
    return std::move(reply).Run(Ok(id, base::Value::Dict().Set("workspaces", std::move(l)), g_revision));
  }
  std::move(reply).Run(Error(id, p::kErrUnknownCommand, "unknown command"));
}

void CommandDispatcher::Cancel(const std::string&) {
  // Commands above complete synchronously or via capture/snapshot callbacks
  // that are safe to drop; cancellation of long-running page interaction is
  // implemented with that feature.
}

}  // namespace justslide
