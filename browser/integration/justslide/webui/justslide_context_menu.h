// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_WEBUI_JUSTSLIDE_CONTEXT_MENU_H_
#define JUSTSLIDE_WEBUI_JUSTSLIDE_CONTEXT_MENU_H_

#include <memory>

#include "base/functional/callback.h"
#include "ui/base/mojom/menu_source_type.mojom-shared.h"
#include "ui/gfx/geometry/point.h"
#include "ui/menus/simple_menu_model.h"

namespace content { class WebContents; }
namespace views { class MenuRunner; }

namespace justslide {

// Native context menu for sidebar items (tabs, favorites, workspaces).
//
// The sidebar is web technology, but menus are a platform affordance: on macOS
// views::MenuRunner with a ui::MenuModel shows a real NSMenu (system font,
// accent highlight, VoiceOver, keyboard navigation and type-select for free);
// on Windows/Linux it shows the platform-styled Views menu. The WebUI only
// sends "menu for <kind,id> at <point>"; items and their enabled state are
// decided here from authoritative browser state.
class SidebarContextMenu : public ui::SimpleMenuModel::Delegate {
 public:
  enum Command {
    kPinTab = 1, kUnpinTab, kAddTabToFavorites, kMoveTabUp, kMoveTabDown, kReopenClosedTab, kCloseTab,
    kOpenFavorite, kMoveFavoriteLeft, kMoveFavoriteRight, kRemoveFavorite,
    kRenameWorkspace,
  };
  using CommandCallback = base::RepeatingCallback<void(int command_id)>;

  explicit SidebarContextMenu(CommandCallback on_command);
  ~SidebarContextMenu() override;

  ui::SimpleMenuModel& model() { return model_; }
  void AddItem(Command c, const std::u16string& label, bool enabled = true);
  void AddSeparator();

  // `point` is in sidebar WebContents (CSS px == DIP) coordinates.
  void Show(content::WebContents* sidebar, const gfx::Point& point, ui::mojom::MenuSourceType source);

  // ui::SimpleMenuModel::Delegate:
  void ExecuteCommand(int command_id, int event_flags) override;

 private:
  CommandCallback on_command_;
  ui::SimpleMenuModel model_{this};
  std::unique_ptr<views::MenuRunner> runner_;
};

}  // namespace justslide

#endif  // JUSTSLIDE_WEBUI_JUSTSLIDE_CONTEXT_MENU_H_
