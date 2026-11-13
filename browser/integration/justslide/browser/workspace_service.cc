// Copyright 2026 Bloxy Studios.
#include "justslide/browser/workspace_service.h"

#include "base/strings/utf_string_conversions.h"
#include "components/bookmarks/browser/bookmark_model.h"
#include "components/bookmarks/browser/bookmark_node.h"
#include "components/bookmarks/common/bookmark_metrics.h"
#include "components/prefs/pref_registry_simple.h"
#include "components/prefs/pref_service.h"
#include "components/prefs/scoped_user_pref_update.h"
#include "justslide/browser/tab_identity.h"
#include "justslide/browser/workspace_service_factory.h"
#include "justslide/common/justslide_constants.h"

namespace justslide {
namespace {
constexpr int kSchemaVersion = 1;

base::Value::Dict ToDict(const Workspace& w) {
  return base::Value::Dict()
      .Set("id", w.id).Set("name", w.name).Set("icon", static_cast<int>(w.icon))
      .Set("agent_owned", w.agent_owned);
}
}  // namespace

// static
void WorkspaceService::RegisterProfilePrefs(PrefRegistrySimple* r) {
  r->RegisterDictionaryPref(kPrefWorkspaces);
  r->RegisterStringPref(kPrefSelectedWorkspace, std::string());
  r->RegisterIntegerPref(kPrefColorMode, 0);
  r->RegisterStringPref(kPrefBackdropColor, std::string());
  r->RegisterBooleanPref(kPrefSidebarCollapsed, false);
  r->RegisterDictionaryPref(kPrefGrants);
}

// static
WorkspaceService* WorkspaceService::Get(content::BrowserContext* context) {
  return WorkspaceServiceFactory::GetForBrowserContext(context);
}

WorkspaceService::WorkspaceService(PrefService* prefs,
                                   bookmarks::BookmarkModel* bookmarks,
                                   ProfileKind kind)
    : prefs_(prefs), bookmarks_(bookmarks), kind_(kind) {
  Load();
}
WorkspaceService::~WorkspaceService() = default;

void WorkspaceService::Load() {
  workspaces_.clear();
  const base::Value::Dict& root = prefs_->GetDict(kPrefWorkspaces);
  // Migration point: unknown future versions are ignored rather than
  // misread; v1 is the first schema.
  if (root.FindInt("version").value_or(0) == kSchemaVersion) {
    if (const base::Value::List* list = root.FindList("items")) {
      for (const base::Value& v : *list) {
        const base::Value::Dict* d = v.GetIfDict();
        if (!d || !d->FindString("id") || !d->FindString("name")) continue;
        Workspace w;
        w.id = *d->FindString("id");
        w.name = *d->FindString("name");
        w.icon = static_cast<WorkspaceIcon>(std::clamp(d->FindInt("icon").value_or(5), 0, 5));
        w.agent_owned = d->FindBool("agent_owned").value_or(false);
        w.profile_kind = kind_;
        workspaces_.push_back(std::move(w));
      }
    }
  }
  if (workspaces_.empty()) {
    // Seed the Figma defaults. Workspace icons are not evidence that any
    // agent is connected.
    Workspace personal{TabIdentity::NewId("ws_"), kind_ == ProfileKind::kAgentIsolated ? "Agent" : "Personal",
                       kind_ == ProfileKind::kAgentIsolated ? WorkspaceIcon::kAgent : WorkspaceIcon::kPersonal, kind_,
                       kind_ == ProfileKind::kAgentIsolated};
    workspaces_.push_back(personal);
    if (kind_ == ProfileKind::kPersonal) {
      workspaces_.push_back({TabIdentity::NewId("ws_"), "ChatGPT", WorkspaceIcon::kChatGpt, kind_, false});
      workspaces_.push_back({TabIdentity::NewId("ws_"), "Claude Code", WorkspaceIcon::kClaudeCode, kind_, false});
    }
    Save();
  }
}

void WorkspaceService::Save() {
  base::Value::List items;
  for (const auto& w : workspaces_) items.Append(ToDict(w));
  ScopedDictPrefUpdate update(prefs_, kPrefWorkspaces);
  update->Set("version", kSchemaVersion);
  update->Set("items", std::move(items));
  for (auto& o : observers_) o.OnWorkspacesChanged();
}

const Workspace* WorkspaceService::Find(const std::string& id) const {
  for (const auto& w : workspaces_) if (w.id == id) return &w;
  return nullptr;
}

const std::string& WorkspaceService::default_workspace_id() const {
  return workspaces_.front().id;
}

const Workspace& WorkspaceService::Create(const std::string& name, WorkspaceIcon icon, bool agent_owned) {
  CHECK_LT(workspaces_.size(), kMaxWorkspaces);
  std::string bounded = base::UTF16ToUTF8(base::UTF8ToUTF16(name).substr(0, kMaxWorkspaceNameChars));
  workspaces_.push_back({TabIdentity::NewId("ws_"), bounded, icon, kind_, agent_owned});
  Save();
  return workspaces_.back();
}

bool WorkspaceService::Rename(const std::string& id, const std::string& name) {
  for (auto& w : workspaces_) {
    if (w.id != id) continue;
    w.name = base::UTF16ToUTF8(base::UTF8ToUTF16(name).substr(0, kMaxWorkspaceNameChars));
    Save();
    return true;
  }
  return false;
}

const bookmarks::BookmarkNode* WorkspaceService::FavoritesFolder(bool create) const {
  if (!bookmarks_ || !bookmarks_->loaded()) return nullptr;
  const bookmarks::BookmarkNode* other = bookmarks_->other_node();
  for (const auto& child : other->children())
    if (child->is_folder() && child->GetTitle() == kFavoritesFolderTitle) return child.get();
  return create ? bookmarks_->AddFolder(other, other->children().size(), kFavoritesFolderTitle) : nullptr;
}

std::vector<Favorite> WorkspaceService::GetFavorites() const {
  std::vector<Favorite> out;
  if (const auto* folder = FavoritesFolder(false)) {
    for (const auto& n : folder->children())
      if (n->is_url()) out.push_back({"fav_" + n->uuid().AsLowercaseString().substr(0, 12), n->url(), n->GetTitle()});
  }
  return out;
}

std::optional<Favorite> WorkspaceService::FindFavorite(const std::string& id) const {
  for (auto& f : GetFavorites()) if (f.id == id) return f;
  return std::nullopt;
}

std::optional<Favorite> WorkspaceService::AddFavorite(const GURL& url, const std::u16string& title) {
  if (!url.is_valid() || !url.SchemeIsHTTPOrHTTPS()) return std::nullopt;
  for (auto& f : GetFavorites()) if (f.url == url) return f;  // idempotent
  const auto* folder = FavoritesFolder(true);
  if (!folder || folder->children().size() >= kMaxFavorites) return std::nullopt;
  bookmarks_->AddURL(folder, folder->children().size(), title.substr(0, 256), url);
  for (auto& o : observers_) o.OnFavoritesChanged();
  for (auto& f : GetFavorites()) if (f.url == url) return f;
  return std::nullopt;
}

bool WorkspaceService::RemoveFavorite(const std::string& id) {
  const auto* folder = FavoritesFolder(false);
  if (!folder) return false;
  for (const auto& n : folder->children()) {
    if ("fav_" + n->uuid().AsLowercaseString().substr(0, 12) != id) continue;
    bookmarks_->Remove(n.get(), bookmarks::metrics::BookmarkEditSource::kUser, FROM_HERE);
    for (auto& o : observers_) o.OnFavoritesChanged();
    return true;
  }
  return false;
}

bool WorkspaceService::MoveFavorite(const std::string& id, int delta) {
  const auto* folder = FavoritesFolder(false);
  if (!folder || (delta != -1 && delta != 1)) return false;
  const auto& kids = folder->children();
  for (size_t i = 0; i < kids.size(); ++i) {
    if ("fav_" + kids[i]->uuid().AsLowercaseString().substr(0, 12) != id) continue;
    if ((delta < 0 && i == 0) || (delta > 0 && i + 1 >= kids.size())) return false;
    // BookmarkModel::Move index is the position before removal.
    bookmarks_->Move(kids[i].get(), folder, delta > 0 ? i + 2 : i - 1);
    for (auto& o : observers_) o.OnFavoritesChanged();
    return true;
  }
  return false;
}

}  // namespace justslide
