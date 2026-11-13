// Copyright 2026 Bloxy Studios.
#include "justslide/webui/justslide_sidebar_ui.h"

#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/webui/favicon_source.h"
#include "chrome/browser/ui/webui/webui_util.h"
#include "components/favicon_base/favicon_url_parser.h"
#include "content/public/browser/url_data_source.h"
#include "content/public/browser/web_contents.h"
#include "content/public/browser/web_ui.h"
#include "content/public/browser/web_ui_data_source.h"
#include "content/public/common/url_constants.h"
#include "justslide/common/justslide_constants.h"
#include "justslide/common/justslide_features.h"
#include "justslide/grit/justslide_sidebar_resources.h"
#include "justslide/grit/justslide_sidebar_resources_map.h"
#include "justslide/webui/justslide_page_handler.h"
#include "services/network/public/mojom/content_security_policy.mojom.h"

namespace justslide {

JustSlideSidebarUIConfig::JustSlideSidebarUIConfig()
    : DefaultTopChromeWebUIConfig(content::kChromeUIScheme, kSidebarHost) {}

bool JustSlideSidebarUIConfig::IsWebUIEnabled(content::BrowserContext*) {
  return base::FeatureList::IsEnabled(features::kJustSlideSidebar);
}
bool JustSlideSidebarUIConfig::IsPreloadable() { return false; }
std::optional<int> JustSlideSidebarUIConfig::GetCommandIdForTesting() {
  return std::nullopt;
}

JustSlideSidebarUI::JustSlideSidebarUI(content::WebUI* web_ui)
    : TopChromeWebUIController(web_ui, /*enable_chrome_send=*/false) {
  Profile* profile = Profile::FromWebUI(web_ui);
  content::WebUIDataSource* source =
      content::WebUIDataSource::CreateAndAdd(profile, kSidebarHost);
  // Prebuilt Parcel output packaged by GRIT (browser/resources/BUILD.gn).
  webui::SetupWebUIDataSource(source, kJustslideSidebarResources,
                              IDR_JUSTSLIDE_SIDEBAR_SIDEBAR_HTML);
  // CSP: keep Chromium's WebUI defaults (script-src chrome://resources
  // 'self'; require-trusted-types-for 'script'; object-src/child-src 'none';
  // frame-ancestors 'none') and only:
  //  * allow the single Trusted Types policy name `default`, which
  //    ui/browser-chrome/src/trusted-types.ts installs to admit the exact ADS
  //    icon glyph strings and nothing else;
  //  * forbid all fetch/XHR/WebSocket/beacon egress from the shell.
  source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::TrustedTypes,
      "trusted-types default;");
  source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::ConnectSrc, "connect-src 'none';");
  source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::ImgSrc,
      "img-src chrome://favicon2 'self' data:;");
  content::URLDataSource::Add(
      profile, std::make_unique<FaviconSource>(
                   profile, chrome::FaviconUrlFormat::kFavicon2));
}

JustSlideSidebarUI::~JustSlideSidebarUI() = default;

void JustSlideSidebarUI::SetOwningWindow(BrowserWindowInterface* window) {
  window_ = window;
}

void JustSlideSidebarUI::BindInterface(
    mojo::PendingReceiver<mojom::PageHandlerFactory> receiver) {
  factory_receiver_.reset();
  factory_receiver_.Bind(std::move(receiver));
}

void JustSlideSidebarUI::CreatePageHandler(
    mojo::PendingRemote<mojom::Page> page,
    mojo::PendingReceiver<mojom::PageHandler> receiver) {
  // Refuse to operate outside the sidebar host (e.g. the URL opened in a
  // normal tab): without an owning window there is nothing to control.
  if (!window_) {
    factory_receiver_.ReportBadMessage("JustSlide sidebar has no owning window");
    return;
  }
  page_handler_ = std::make_unique<JustSlidePageHandler>(
      std::move(receiver), std::move(page), window_, web_ui()->GetWebContents());
}

WEB_UI_CONTROLLER_TYPE_IMPL(JustSlideSidebarUI)

}  // namespace justslide
