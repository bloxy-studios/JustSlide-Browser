// Copyright 2026 Bloxy Studios.
// Native acceptance tests for the first vertical slice. NOT YET BUILT.
#include "chrome/browser/ui/browser.h"
#include "chrome/browser/ui/tabs/tab_strip_model.h"
#include "chrome/test/base/in_process_browser_test.h"
#include "chrome/test/base/ui_test_utils.h"
#include "content/public/browser/web_contents.h"
#include "content/public/test/browser_test.h"
#include "content/public/test/browser_test_utils.h"
#include "justslide/browser/background_tab_ops.h"
#include "justslide/browser/tab_identity.h"
#include "justslide/common/justslide_constants.h"
#include "net/test/embedded_test_server/embedded_test_server.h"

namespace justslide {

class JustSlideBrowserTest : public InProcessBrowserTest {
 protected:
  void SetUpOnMainThread() override {
    InProcessBrowserTest::SetUpOnMainThread();
    embedded_test_server()->ServeFilesFromSourceDirectory("justslide/test/data");
    ASSERT_TRUE(embedded_test_server()->Start());
  }
};

// Agent tab creation must not change the active tab or steal focus.
IN_PROC_BROWSER_TEST_F(JustSlideBrowserTest, BackgroundTabDoesNotActivate) {
  ASSERT_TRUE(ui_test_utils::NavigateToURL(browser(), embedded_test_server()->GetURL("/typing.html")));
  TabStripModel* m = browser()->tab_strip_model();
  content::WebContents* human = m->GetActiveWebContents();
  ASSERT_TRUE(content::ExecJs(human, "document.querySelector('textarea').focus()"));
  content::WebContents* agent = OpenBackgroundTab(browser(), embedded_test_server()->GetURL("/agent.html"), /*pinned=*/true, "ws_agenttest");
  ASSERT_TRUE(agent);
  EXPECT_EQ(m->GetActiveWebContents(), human);
  EXPECT_TRUE(m->IsTabPinned(m->GetIndexOfWebContents(agent)));
  EXPECT_EQ(true, content::EvalJs(human, "document.activeElement.tagName === 'TEXTAREA'"));
  EXPECT_EQ(TabIdentity::FromWebContents(agent)->opened_by(), OpenedBy::kAgent);
}

// Capture returns the agent tab's pixels, not the visible page, without activation.
IN_PROC_BROWSER_TEST_F(JustSlideBrowserTest, CaptureHiddenTab) {
  content::WebContents* agent = OpenBackgroundTab(browser(), embedded_test_server()->GetURL("/agent.html"), false, "ws_agenttest");
  content::WaitForLoadStop(agent);
  base::RunLoop loop;
  SkBitmap shot;
  CaptureTab(agent, 640, base::BindLambdaForTesting([&](const SkBitmap& b) { shot = b; loop.Quit(); }));
  loop.Run();
  EXPECT_NE(browser()->tab_strip_model()->GetActiveWebContents(), agent);
  // Hidden-tab capture may be unsupported on some configurations; the API
  // must then return an empty bitmap (reported as `unsupported`), never the
  // active page. agent.html paints a solid #00ff00 body.
  if (!shot.drawsNothing()) EXPECT_EQ(shot.getColor(shot.width() / 2, shot.height() / 2), SK_ColorGREEN);
}

// The trusted sidebar URL opened in an ordinary tab must not get a working
// PageHandler (no owning window) — the factory reports a bad message.
IN_PROC_BROWSER_TEST_F(JustSlideBrowserTest, SidebarUrlInTabIsInert) {
  ASSERT_TRUE(ui_test_utils::NavigateToURL(browser(), GURL(kSidebarURL)));
  content::WebContents* wc = browser()->tab_strip_model()->GetActiveWebContents();
  EXPECT_EQ(false, content::EvalJs(wc, "!!document.querySelector('[data-testid=sidebar]')"));
}

// A web page must not reach the JustSlide Mojo interface.
IN_PROC_BROWSER_TEST_F(JustSlideBrowserTest, WebPageCannotBindShellInterface) {
  ASSERT_TRUE(ui_test_utils::NavigateToURL(browser(), embedded_test_server()->GetURL("/hostile.html")));
  content::WebContents* wc = browser()->tab_strip_model()->GetActiveWebContents();
  EXPECT_EQ("blocked", content::EvalJs(wc, "window.__justslideProbe()"));
}

}  // namespace justslide
