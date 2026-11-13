// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_BROWSER_TAB_IDENTITY_H_
#define JUSTSLIDE_BROWSER_TAB_IDENTITY_H_

#include <string>

#include "content/public/browser/web_contents_user_data.h"

namespace justslide {

enum class OpenedBy { kUser, kAgent, kExtension, kRestore, kPopup };

// Durable JustSlide identity for a tab, attached to its WebContents.
//
// * `tab_id` ("tab_<base32>") is stable across restarts: it is mirrored into
//   every NavigationEntry's extended info (see RegisterSessionPersistence) so
//   Chromium's own session restore carries it. It is never a tab index,
//   SessionID, TabHandle or renderer process id.
// * On restore/duplicate the same id can appear twice; Reconcile() keeps the
//   first claimant and mints a fresh id for the other.
// * Tabs created by extensions or popups get the opener's workspace.
class TabIdentity : public content::WebContentsUserData<TabIdentity> {
 public:
  ~TabIdentity() override;

  static TabIdentity* GetOrCreate(content::WebContents* contents,
                                  const std::string& fallback_workspace_id,
                                  OpenedBy opened_by);

  const std::string& tab_id() const { return tab_id_; }
  const std::string& workspace_id() const { return workspace_id_; }
  OpenedBy opened_by() const { return opened_by_; }
  // Monotonic counter bumped on every committed main-frame navigation; used
  // as `navigationId` precondition so stale agent actions fail.
  const std::string& navigation_id() const { return navigation_id_; }

  void SetWorkspace(const std::string& workspace_id);
  void OnPrimaryNavigationCommitted();
  void ReassignIdForDuplicate();

  // Registers the ExtendedInfoHandlers with
  // sessions::ContentSerializedNavigationDriver. Call once at startup.
  static void RegisterSessionPersistence();

  static std::string NewId(const char* prefix);

 private:
  friend class content::WebContentsUserData<TabIdentity>;
  TabIdentity(content::WebContents* contents, std::string tab_id,
              std::string workspace_id, OpenedBy opened_by);
  void MirrorToNavigationEntries();

  std::string tab_id_;
  std::string workspace_id_;
  OpenedBy opened_by_;
  std::string navigation_id_;
  uint64_t navigation_counter_ = 0;

  WEB_CONTENTS_USER_DATA_KEY_DECL();
};

}  // namespace justslide

#endif  // JUSTSLIDE_BROWSER_TAB_IDENTITY_H_
