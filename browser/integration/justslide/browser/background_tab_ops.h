// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_BROWSER_BACKGROUND_TAB_OPS_H_
#define JUSTSLIDE_BROWSER_BACKGROUND_TAB_OPS_H_

#include <string>
#include "base/functional/callback.h"
#include "ui/gfx/geometry/size.h"
#include "url/gurl.h"

class BrowserWindowInterface;
class SkBitmap;
namespace content { class WebContents; }

namespace justslide {

// Opens `url` as a background tab in `window` without activating the tab,
// the window or the workspace and without taking focus. Uses Chromium's
// navigator with NEW_BACKGROUND_TAB (which strips ADD_ACTIVE) and
// WindowAction::kNoAction. Upstream TabStripService::CreateTabAt always
// activates, so it is deliberately not used for agent requests.
content::WebContents* OpenBackgroundTab(BrowserWindowInterface* window,
                                        const GURL& url, bool pinned,
                                        const std::string& workspace_id);

// Captures the *specified* tab even if hidden/occluded: keeps it rendering
// via WebContents::IncrementCapturerCount(stay_hidden=true) for the duration
// of the copy, then copies from that tab's own RenderWidgetHostView. Never
// activates the tab and never falls back to the visible page. Reports
// failure (empty bitmap) when no surface can be produced.
void CaptureTab(content::WebContents* contents, int max_edge_px,
                base::OnceCallback<void(const SkBitmap&)> done);

struct SnapshotNode { std::string role; std::string name; int depth = 0; };
// Bounded accessibility snapshot of the tab (password fields redacted).
void SnapshotTab(content::WebContents* contents, size_t max_nodes,
                 base::OnceCallback<void(std::vector<SnapshotNode>, bool truncated)> done);

}  // namespace justslide

#endif  // JUSTSLIDE_BROWSER_BACKGROUND_TAB_OPS_H_
