// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_BROWSER_WORKSPACE_SERVICE_H_
#define JUSTSLIDE_BROWSER_WORKSPACE_SERVICE_H_

#include <optional>
#include <string>
#include <vector>

#include "base/observer_list.h"
#include "components/keyed_service/core/keyed_service.h"
#include "url/gurl.h"

class PrefService;
class PrefRegistrySimple;
namespace bookmarks { class BookmarkModel; class BookmarkNode; }
namespace content { class BrowserContext; }

namespace justslide {

// Order matches mojom::WorkspaceIcon (persisted as int; append only).
enum class WorkspaceIcon { kPersonal, kChatGpt, kClaudeCode, kAgent, kWork, kGeneric, kCodex };
enum class ProfileKind { kPersonal, kAgentIsolated };

struct Workspace {
  std::string id;
  std::string name;
  WorkspaceIcon icon = WorkspaceIcon::kGeneric;
  ProfileKind profile_kind = ProfileKind::kPersonal;
  bool agent_owned = false;
};

struct Favorite {
  std::string id;  // "fav_" + bookmark node uuid prefix
  GURL url;
  std::u16string title;
};

// Per-Profile JustSlide organisation layer. Owns ONLY state Chromium does not
// already have: the workspace list and selection (profile prefs). Tabs stay in
// TabStripModel; favorites are a bookmark folder in BookmarkModel; history,
// downloads, cookies and extensions remain Chromium's.
//
// A workspace is organisational, not a data boundary: all workspaces in this
// profile share its cookies, storage and extensions. Agent-isolated
// workspaces live in a *separate* Profile (see docs/adr/0004).
class WorkspaceService : public KeyedService {
 public:
  class Observer : public base::CheckedObserver {
   public:
    virtual void OnWorkspacesChanged() {}
    virtual void OnFavoritesChanged() {}
  };

  WorkspaceService(PrefService* prefs, bookmarks::BookmarkModel* bookmarks,
                   ProfileKind kind);
  ~WorkspaceService() override;

  static void RegisterProfilePrefs(PrefRegistrySimple* registry);
  static WorkspaceService* Get(content::BrowserContext* context);

  const std::vector<Workspace>& workspaces() const { return workspaces_; }
  const Workspace* Find(const std::string& id) const;
  const std::string& default_workspace_id() const;
  const Workspace& Create(const std::string& name, WorkspaceIcon icon, bool agent_owned);
  bool Rename(const std::string& id, const std::string& name);

  std::vector<Favorite> GetFavorites() const;
  std::optional<Favorite> AddFavorite(const GURL& url, const std::u16string& title);
  bool RemoveFavorite(const std::string& id);
  bool MoveFavorite(const std::string& id, int delta);
  std::optional<Favorite> FindFavorite(const std::string& id) const;

  void AddObserver(Observer* o) { observers_.AddObserver(o); }
  void RemoveObserver(Observer* o) { observers_.RemoveObserver(o); }

  // Input bounds enforced for every caller (WebUI and automation).
  static constexpr size_t kMaxWorkspaceNameChars = 64;
  static constexpr size_t kMaxWorkspaces = 32;
  static constexpr size_t kMaxFavorites = 48;

 private:
  void Load();
  void Save();
  const bookmarks::BookmarkNode* FavoritesFolder(bool create) const;

  raw_ptr<PrefService> prefs_;
  raw_ptr<bookmarks::BookmarkModel> bookmarks_;
  ProfileKind kind_;
  std::vector<Workspace> workspaces_;
  base::ObserverList<Observer> observers_;
};

}  // namespace justslide

#endif  // JUSTSLIDE_BROWSER_WORKSPACE_SERVICE_H_
