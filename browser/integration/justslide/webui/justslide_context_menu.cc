// Copyright 2026 Bloxy Studios.
#include "justslide/webui/justslide_context_menu.h"

#include "content/public/browser/web_contents.h"
#include "ui/gfx/geometry/rect.h"
#include "ui/menus/menu_separator_types.h"
#include "ui/views/controls/menu/menu_runner.h"
#include "ui/views/widget/widget.h"

namespace justslide {

SidebarContextMenu::SidebarContextMenu(CommandCallback on_command) : on_command_(std::move(on_command)) {}
SidebarContextMenu::~SidebarContextMenu() = default;

void SidebarContextMenu::AddItem(Command c, const std::u16string& label, bool enabled) {
  model_.AddItem(c, label);
  model_.SetEnabledAt(model_.GetItemCount() - 1, enabled);
}

void SidebarContextMenu::AddSeparator() { model_.AddSeparator(ui::NORMAL_SEPARATOR); }

void SidebarContextMenu::Show(content::WebContents* sidebar, const gfx::Point& point,
                              ui::mojom::MenuSourceType source) {
  views::Widget* widget = views::Widget::GetTopLevelWidgetForNativeView(sidebar->GetNativeView());
  if (!widget) return;
  const gfx::Point screen = sidebar->GetContainerBounds().origin() + point.OffsetFromOrigin();
  runner_ = std::make_unique<views::MenuRunner>(&model_, views::MenuRunner::CONTEXT_MENU | views::MenuRunner::HAS_MNEMONICS);
  // Blocking on macOS (native NSMenu); the caller keeps `this` alive.
  runner_->RunMenuAt(widget, nullptr, gfx::Rect(screen, gfx::Size()), views::MenuAnchorPosition::kTopLeft, source);
}

void SidebarContextMenu::ExecuteCommand(int command_id, int) { on_command_.Run(command_id); }

}  // namespace justslide
