// Copyright 2026 Bloxy Studios.
#include "justslide/browser/background_tab_ops.h"

#include "base/functional/callback_helpers.h"
#include "base/timer/timer.h"
#include "chrome/browser/ui/browser_window/public/browser_window_interface.h"
#include "chrome/browser/ui/navigator/browser_navigator.h"
#include "chrome/browser/ui/navigator/browser_navigator_params.h"
#include "chrome/browser/ui/tabs/tab_enums.h"
#include "content/public/browser/navigation_handle.h"
#include "content/public/browser/render_widget_host_view.h"
#include "content/public/browser/web_contents.h"
#include "justslide/browser/tab_identity.h"
#include "third_party/skia/include/core/SkBitmap.h"
#include "ui/accessibility/ax_mode.h"
#include "ui/accessibility/ax_tree_update.h"
#include "ui/base/page_transition_types.h"
#include "ui/base/window_open_disposition.h"

namespace justslide {

content::WebContents* OpenBackgroundTab(BrowserWindowInterface* window, const GURL& url,
                                        bool pinned, const std::string& workspace_id) {
  if (!url.is_valid() || !url.SchemeIsHTTPOrHTTPS()) return nullptr;
  NavigateParams params(window, url, ui::PAGE_TRANSITION_AUTO_TOPLEVEL);
  params.disposition = WindowOpenDisposition::NEW_BACKGROUND_TAB;
  params.tabstrip_add_types = AddTabTypes::ADD_NONE | (pinned ? AddTabTypes::ADD_PINNED : 0);
  params.window_action = NavigateParams::WindowAction::kNoAction;
  params.is_renderer_initiated = false;
  base::WeakPtr<content::NavigationHandle> handle = Navigate(&params);
  content::WebContents* contents = params.navigated_or_inserted_contents;
  if (!contents) return nullptr;
  TabIdentity::GetOrCreate(contents, workspace_id, OpenedBy::kAgent)->SetWorkspace(workspace_id);
  return contents;
}

void CaptureTab(content::WebContents* contents, int max_edge_px,
                base::OnceCallback<void(const SkBitmap&)> done) {
  content::RenderWidgetHostView* view = contents ? contents->GetRenderWidgetHostView() : nullptr;
  if (!view) { std::move(done).Run(SkBitmap()); return; }
  gfx::Size src = view->GetViewBounds().size();
  if (src.IsEmpty()) src = contents->GetContainerBounds().size();
  if (src.IsEmpty()) { std::move(done).Run(SkBitmap()); return; }
  float scale = std::min(1.0f, float(max_edge_px) / std::max(src.width(), src.height()));
  gfx::Size out(std::max(1, int(src.width() * scale)), std::max(1, int(src.height() * scale)));
  // Keep the hidden tab producing frames while we copy, without showing it.
  base::ScopedClosureRunner keep_rendering = contents->IncrementCapturerCount(
      out, /*stay_hidden=*/true, /*stay_awake=*/true, /*is_activity=*/false);
  view->CopyFromSurface(gfx::Rect(), out, base::TimeDelta(),
      base::BindOnce([](base::ScopedClosureRunner, base::OnceCallback<void(const SkBitmap&)> cb,
                        const viz::CopyOutputBitmapWithMetadata& result) {
        std::move(cb).Run(result.bitmap);
      }, std::move(keep_rendering), std::move(done)));
}

void SnapshotTab(content::WebContents* contents, size_t max_nodes,
                 base::OnceCallback<void(std::vector<SnapshotNode>, bool)> done) {
  if (!contents) { std::move(done).Run({}, false); return; }
  contents->RequestAXTreeSnapshot(
      base::BindOnce([](size_t max_nodes, base::OnceCallback<void(std::vector<SnapshotNode>, bool)> cb,
                        ui::AXTreeUpdate& update) {
        std::vector<SnapshotNode> out;
        for (const ui::AXNodeData& n : update.nodes) {
          if (out.size() >= max_nodes) break;
          std::string name = n.GetStringAttribute(ax::mojom::StringAttribute::kName);
          // Never expose password field contents or labels' values.
          if (n.HasState(ax::mojom::State::kProtected)) name = "[redacted]";
          if (name.size() > 512) name.resize(512);
          out.push_back({std::string(ui::ToString(n.role)), std::move(name), 0});
        }
        std::move(cb).Run(std::move(out), update.nodes.size() > max_nodes);
      }, max_nodes, std::move(done)),
      ui::kAXModeWebContentsOnly, max_nodes, base::Seconds(5),
      content::WebContents::AXTreeSnapshotPolicy::kAll);
}

}  // namespace justslide
