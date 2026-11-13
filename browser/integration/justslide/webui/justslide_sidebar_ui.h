// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_WEBUI_JUSTSLIDE_SIDEBAR_UI_H_
#define JUSTSLIDE_WEBUI_JUSTSLIDE_SIDEBAR_UI_H_

#include <memory>
#include <string_view>

#include "chrome/browser/ui/webui/top_chrome/top_chrome_web_ui_controller.h"
#include "chrome/browser/ui/webui/top_chrome/top_chrome_webui_config.h"
#include "justslide/webui/justslide_shell.mojom.h"
#include "mojo/public/cpp/bindings/pending_receiver.h"
#include "mojo/public/cpp/bindings/receiver.h"

class BrowserWindowInterface;

namespace justslide {

class JustSlidePageHandler;
class JustSlideSidebarUI;

class JustSlideSidebarUIConfig
    : public DefaultTopChromeWebUIConfig<JustSlideSidebarUI> {
 public:
  JustSlideSidebarUIConfig();
  bool IsWebUIEnabled(content::BrowserContext* browser_context) override;
  bool IsPreloadable() override;
  std::optional<int> GetCommandIdForTesting() override;
};

// Trusted sidebar WebUI. Only meaningful when embedded by
// JustSlideSidebarHost in a browser window; if loaded any other way (e.g. a
// user types the URL into a tab) the page handler refuses to bind because no
// owning BrowserWindowInterface was injected.
class JustSlideSidebarUI : public TopChromeWebUIController,
                           public mojom::PageHandlerFactory {
 public:
  explicit JustSlideSidebarUI(content::WebUI* web_ui);
  JustSlideSidebarUI(const JustSlideSidebarUI&) = delete;
  JustSlideSidebarUI& operator=(const JustSlideSidebarUI&) = delete;
  ~JustSlideSidebarUI() override;

  static constexpr std::string_view GetWebUIName() { return "JustSlideSidebar"; }

  // Called by JustSlideSidebarHost before the document loads.
  void SetOwningWindow(BrowserWindowInterface* window);

  void BindInterface(mojo::PendingReceiver<mojom::PageHandlerFactory> receiver);

 private:
  // mojom::PageHandlerFactory:
  void CreatePageHandler(
      mojo::PendingRemote<mojom::Page> page,
      mojo::PendingReceiver<mojom::PageHandler> receiver) override;

  raw_ptr<BrowserWindowInterface> window_ = nullptr;
  std::unique_ptr<JustSlidePageHandler> page_handler_;
  mojo::Receiver<mojom::PageHandlerFactory> factory_receiver_{this};

  WEB_UI_CONTROLLER_TYPE_DECL();
};

}  // namespace justslide

#endif  // JUSTSLIDE_WEBUI_JUSTSLIDE_SIDEBAR_UI_H_
