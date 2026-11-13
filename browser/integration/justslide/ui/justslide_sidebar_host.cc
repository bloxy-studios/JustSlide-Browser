// Copyright 2026 Bloxy Studios.
#include "justslide/ui/justslide_sidebar_host.h"

#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/browser_window/public/browser_window_interface.h"
#include "components/prefs/pref_service.h"
#include "content/public/browser/web_contents.h"
#include "content/public/browser/web_ui.h"
#include "justslide/common/justslide_constants.h"
#include "justslide/common/justslide_features.h"
#include "justslide/webui/justslide_sidebar_ui.h"
#include "ui/base/metadata/metadata_impl_macros.h"

namespace justslide {

// static
JustSlideSidebarHost* JustSlideSidebarHost::MaybeAttach(views::View* region, BrowserWindowInterface* window) {
  if (!base::FeatureList::IsEnabled(features::kJustSlideSidebar)) return nullptr;
  return region->AddChildView(std::make_unique<JustSlideSidebarHost>(window));
}

JustSlideSidebarHost::JustSlideSidebarHost(BrowserWindowInterface* window)
    : views::WebView(window->GetProfile()), window_(window) {
  SetProperty(views::kElementIdentifierKey, ui::ElementIdentifier());
  GetViewAccessibility().SetName(u"JustSlide sidebar");
  LoadInitialURL(GURL(kSidebarURL));
  // Inject the owning window before any page handler can be created; the
  // controller rejects handler creation without it.
  if (content::WebUI* web_ui = GetWebContents()->GetWebUI()) {
    if (auto* ui = web_ui->GetController()->GetAs<JustSlideSidebarUI>()) ui->SetOwningWindow(window_);
  }
  prefs_.Init(window->GetProfile()->GetPrefs());
  prefs_.Add(kPrefSidebarCollapsed, base::BindRepeating(&JustSlideSidebarHost::OnCollapsedChanged, base::Unretained(this)));
}

JustSlideSidebarHost::~JustSlideSidebarHost() = default;

int JustSlideSidebarHost::GetDesiredWidth() const {
  return window_->GetProfile()->GetPrefs()->GetBoolean(kPrefSidebarCollapsed) ? kRailWidthDip : kExpandedWidthDip;
}

void JustSlideSidebarHost::OnCollapsedChanged() {
  PreferredSizeChanged();  // region/BrowserView relayout to rail or full width
}

BEGIN_METADATA(JustSlideSidebarHost)
END_METADATA

}  // namespace justslide
