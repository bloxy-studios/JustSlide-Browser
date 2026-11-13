// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_UI_JUSTSLIDE_SIDEBAR_HOST_H_
#define JUSTSLIDE_UI_JUSTSLIDE_SIDEBAR_HOST_H_

#include "components/prefs/pref_change_registrar.h"
#include "ui/views/controls/webview/webview.h"

class BrowserWindowInterface;

namespace justslide {

// Native host of the trusted sidebar WebUI inside the browser window's
// leading-edge (vertical tab strip) region.
//
// * The sidebar is its own WebContents (trusted chrome:// renderer); page
//   WebContents remain separate native views laid out by BrowserView — the
//   shell never contains page DOM, and page DOM never overlaps the shell.
// * Menus/permission prompts that must cross the content boundary are
//   Chromium-native bubbles/widgets anchored to this view, not DOM overlays.
// * The sidebar WebContents is not in TabStripModel, so it never appears in
//   chrome.tabs or receives content scripts.
//
// SPIKE STATUS: the attach point in VerticalTabStripRegionView's
// LayoutDelegate (which positions only its known children) is unproven; see
// docs/chromium-integration.md "Sidebar host layout" for the two candidate
// approaches and the interactive_ui_tests that must pass.
class JustSlideSidebarHost : public views::WebView {
  METADATA_HEADER(JustSlideSidebarHost, views::WebView)
 public:
  // Must match ui/browser-chrome/src/components/Sidebar.tsx: 6 px frame
  // padding + 240 px column + 6 px gap; rail 6 + 32 + 6. The page view sits
  // 6 px from the window edges (top/right/bottom), radius 16, flush (no shadow/border).
  static constexpr int kExpandedWidthDip = 252;
  static constexpr int kRailWidthDip = 44;
  static constexpr int kFramePaddingDip = 6;

  // Returns the host added as a child of `region`, or nullptr when the
  // JustSlideSidebar feature is disabled.
  static JustSlideSidebarHost* MaybeAttach(views::View* region, BrowserWindowInterface* window);

  JustSlideSidebarHost(BrowserWindowInterface* window);
  ~JustSlideSidebarHost() override;

  int GetDesiredWidth() const;

 private:
  void OnCollapsedChanged();
  raw_ptr<BrowserWindowInterface> window_;
  PrefChangeRegistrar prefs_;
};

}  // namespace justslide

#endif  // JUSTSLIDE_UI_JUSTSLIDE_SIDEBAR_HOST_H_
