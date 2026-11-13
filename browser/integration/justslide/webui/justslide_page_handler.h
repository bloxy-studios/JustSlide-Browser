// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_WEBUI_JUSTSLIDE_PAGE_HANDLER_H_
#define JUSTSLIDE_WEBUI_JUSTSLIDE_PAGE_HANDLER_H_

#include "base/memory/raw_ptr.h"
#include "base/scoped_observation.h"
#include "base/timer/timer.h"
#include "chrome/browser/ui/tabs/tab_strip_model_observer.h"
#include "justslide/browser/workspace_service.h"
#include "justslide/webui/justslide_shell.mojom.h"
#include "mojo/public/cpp/bindings/receiver.h"
#include "mojo/public/cpp/bindings/remote.h"

class BrowserWindowInterface;
class TabStripModel;
namespace content { class WebContents; }

namespace justslide {

// Browser-process side of the sidebar. Builds sanitized ShellSnapshots from
// authoritative Chromium state (TabStripModel, NavigationController, security
// state, BookmarkModel) plus WorkspaceService, and executes validated
// intents. Changes from any origin (native menus, shortcuts, extensions,
// automation) arrive through TabStripModelObserver / WorkspaceService
// observers, so the UI never assumes React initiated a change.
class JustSlidePageHandler : public mojom::PageHandler,
                             public TabStripModelObserver,
                             public WorkspaceService::Observer {
 public:
  JustSlidePageHandler(mojo::PendingReceiver<mojom::PageHandler> receiver,
                       mojo::PendingRemote<mojom::Page> page,
                       BrowserWindowInterface* window,
                       content::WebContents* sidebar_contents);
  ~JustSlidePageHandler() override;

  // mojom::PageHandler:
  void GetSnapshot(GetSnapshotCallback callback) override;
  void NavigateFromInput(const std::string& text) override;
  void GoBack() override;
  void GoForward() override;
  void Reload() override;
  void StopLoading() override;
  void ToggleSidebar() override;
  void SelectTab(const std::string& tab_id) override;
  void CreateTab() override;
  void CloseTab(const std::string& tab_id) override;
  void ReopenClosedTab() override;
  void SetTabPinned(const std::string& tab_id, bool pinned) override;
  void MoveTab(const std::string& tab_id, int32_t delta) override;
  void SelectWorkspace(const std::string& workspace_id) override;
  void CreateWorkspace(const std::string& name) override;
  void RenameWorkspace(const std::string& workspace_id, const std::string& name) override;
  void AddFavoriteForActiveTab() override;
  void RemoveFavorite(const std::string& favorite_id) override;
  void MoveFavorite(const std::string& favorite_id, int32_t delta) override;
  void OpenFavorite(const std::string& favorite_id) override;
  void ResolvePendingRequest(const std::string& request_id, bool approve) override;
  void SetAgentPaused(const std::string& grant_id, bool paused) override;
  void RevokeAgent(const std::string& grant_id) override;
  void SetColorMode(mojom::ColorMode mode) override;
  void SetBackdropColor(const std::string& css_hex) override;
  void ShowPairingDialog() override;
  void ShowDownloads() override;

  // TabStripModelObserver:
  void OnTabStripModelChanged(TabStripModel* model, const TabStripModelChange& change,
                              const TabStripSelectionChange& selection) override;
  void TabChangedAt(content::WebContents* contents, int index, TabChangeType type) override;
  // WorkspaceService::Observer:
  void OnWorkspacesChanged() override;
  void OnFavoritesChanged() override;

  mojom::ShellSnapshotPtr BuildSnapshot();

 private:
  int IndexOfTab(const std::string& tab_id) const;
  void ScheduleSnapshot();
  void PushSnapshot();

  mojo::Receiver<mojom::PageHandler> receiver_;
  mojo::Remote<mojom::Page> page_;
  raw_ptr<BrowserWindowInterface> window_;
  raw_ptr<TabStripModel> model_;
  raw_ptr<WorkspaceService> workspaces_;
  std::string selected_workspace_id_;
  int64_t revision_ = 0;
  // Coalesce bursts (e.g. 30 agent tabs) into one snapshot per frame-ish.
  base::OneShotTimer debounce_;
  base::ScopedObservation<WorkspaceService, WorkspaceService::Observer> ws_obs_{this};
};

}  // namespace justslide

#endif  // JUSTSLIDE_WEBUI_JUSTSLIDE_PAGE_HANDLER_H_
