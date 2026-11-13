// Copyright 2026 Bloxy Studios.
#include "justslide/webui/justslide_page_handler.h"

#include "base/strings/utf_string_conversions.h"
#include "chrome/app/chrome_command_ids.h"
#include "chrome/browser/autocomplete/autocomplete_classifier_factory.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/browser_commands.h"
#include "chrome/browser/ui/browser_window/public/browser_window_interface.h"
#include "chrome/browser/ui/navigator/browser_navigator.h"
#include "chrome/browser/ui/navigator/browser_navigator_params.h"
#include "chrome/browser/ui/tabs/tab_strip_model.h"
#include "components/omnibox/browser/autocomplete_classifier.h"
#include "components/omnibox/browser/autocomplete_match.h"
#include "components/prefs/pref_service.h"
#include "components/security_state/content/security_state_tab_helper.h"
#include "content/public/browser/navigation_controller.h"
#include "content/public/browser/web_contents.h"
#include "justslide/browser/tab_identity.h"
#include "justslide/common/justslide_constants.h"
#include "third_party/metrics_proto/omnibox_event.pb.h"

namespace justslide {
namespace {
constexpr size_t kMaxInputChars = 8192;
constexpr base::TimeDelta kDebounce = base::Milliseconds(16);

mojom::OpenedBy ToMojo(OpenedBy b) { return static_cast<mojom::OpenedBy>(b); }

mojom::SecurityLevel SecurityOf(content::WebContents* wc) {
  if (!wc) return mojom::SecurityLevel::kUnknown;
  const GURL& url = wc->GetLastCommittedURL();
  if (url.SchemeIs("chrome")) return mojom::SecurityLevel::kInternal;
  auto* helper = SecurityStateTabHelper::FromWebContents(wc);
  if (!helper) return mojom::SecurityLevel::kUnknown;
  switch (helper->GetSecurityLevel()) {
    case security_state::SECURE: return mojom::SecurityLevel::kSecure;
    case security_state::DANGEROUS: return mojom::SecurityLevel::kDangerous;
    case security_state::NONE: case security_state::WARNING: return mojom::SecurityLevel::kInsecure;
    default: return mojom::SecurityLevel::kUnknown;
  }
}
}  // namespace

JustSlidePageHandler::JustSlidePageHandler(
    mojo::PendingReceiver<mojom::PageHandler> receiver,
    mojo::PendingRemote<mojom::Page> page, BrowserWindowInterface* window,
    content::WebContents* sidebar_contents)
    : receiver_(this, std::move(receiver)),
      page_(std::move(page)),
      window_(window),
      model_(window->GetTabStripModel()),
      workspaces_(WorkspaceService::Get(window->GetProfile())) {
  model_->AddObserver(this);
  ws_obs_.Observe(workspaces_.get());
  selected_workspace_id_ = window->GetProfile()->GetPrefs()->GetString(kPrefSelectedWorkspace);
  if (!workspaces_->Find(selected_workspace_id_)) selected_workspace_id_ = workspaces_->default_workspace_id();
  // Tabs that existed before the sidebar (restore, extensions) get identities.
  for (int i = 0; i < model_->count(); ++i)
    TabIdentity::GetOrCreate(model_->GetWebContentsAt(i), selected_workspace_id_, OpenedBy::kRestore);
}

JustSlidePageHandler::~JustSlidePageHandler() { model_->RemoveObserver(this); }

int JustSlidePageHandler::IndexOfTab(const std::string& tab_id) const {
  for (int i = 0; i < model_->count(); ++i) {
    auto* id = TabIdentity::FromWebContents(model_->GetWebContentsAt(i));
    if (id && id->tab_id() == tab_id) return i;
  }
  return TabStripModel::kNoTab;
}

mojom::ShellSnapshotPtr JustSlidePageHandler::BuildSnapshot() {
  auto s = mojom::ShellSnapshot::New();
  s->revision = ++revision_;
  s->selected_workspace_id = selected_workspace_id_;
  content::WebContents* active = model_->GetActiveWebContents();
  PrefService* prefs = window_->GetProfile()->GetPrefs();
  s->sidebar_collapsed = prefs->GetBoolean(kPrefSidebarCollapsed);
  s->color_mode = static_cast<mojom::ColorMode>(std::clamp(prefs->GetInteger(kPrefColorMode), 0, 2));
  s->backdrop_color = prefs->GetString(kPrefBackdropColor);
  if (active) {
    s->display_url = active->GetVisibleURL().spec();  // full, unelided
    s->origin = active->GetVisibleURL().host();
    s->security_level = SecurityOf(active);
    s->can_go_back = active->GetController().CanGoBack();
    s->can_go_forward = active->GetController().CanGoForward();
  }
  for (const auto& w : workspaces_->workspaces()) {
    s->workspaces.push_back(mojom::WorkspaceInfo::New(w.id, w.name, static_cast<mojom::WorkspaceIcon>(w.icon),
                                                      static_cast<mojom::ProfileKind>(w.profile_kind), w.agent_owned));
  }
  // Every tab of this window is listed (UI filters by workspace); the sidebar
  // is trusted browser UI for the profile that owns the window.
  for (int i = 0; i < model_->count(); ++i) {
    content::WebContents* wc = model_->GetWebContentsAt(i);
    auto* id = TabIdentity::GetOrCreate(wc, selected_workspace_id_, OpenedBy::kUser);
    auto t = mojom::TabInfo::New();
    t->id = id->tab_id();
    t->workspace_id = id->workspace_id();
    t->url = wc->GetVisibleURL();
    t->title = base::UTF16ToUTF8(wc->GetTitle()).substr(0, 512);
    t->pinned = model_->IsTabPinned(i);
    t->loading = wc->IsLoading();
    t->active = wc == active;
    t->opened_by = ToMojo(id->opened_by());
    t->crashed = wc->IsCrashed();
    t->audible = wc->IsCurrentlyAudible();
    t->has_error = wc->GetController().GetLastCommittedEntry() &&
                   wc->GetController().GetLastCommittedEntry()->GetPageType() == content::PAGE_TYPE_ERROR;
    if (wc == active) s->active_tab_id = t->id;
    s->tabs.push_back(std::move(t));
  }
  for (const auto& f : workspaces_->GetFavorites())
    s->favorites.push_back(mojom::FavoriteInfo::New(f.id, f.url, base::UTF16ToUTF8(f.title)));
  // Agent grants/pending requests are filled by the automation layer
  // (AutomationRegistry::FillSnapshot) — omitted until that lands natively.
  return s;
}

void JustSlidePageHandler::ScheduleSnapshot() {
  if (!debounce_.IsRunning())
    debounce_.Start(FROM_HERE, kDebounce, base::BindOnce(&JustSlidePageHandler::PushSnapshot, base::Unretained(this)));
}
void JustSlidePageHandler::PushSnapshot() { page_->SnapshotChanged(BuildSnapshot()); }

void JustSlidePageHandler::GetSnapshot(GetSnapshotCallback cb) { std::move(cb).Run(BuildSnapshot()); }

void JustSlidePageHandler::NavigateFromInput(const std::string& text) {
  if (text.empty() || text.size() > kMaxInputChars) return;
  content::WebContents* active = model_->GetActiveWebContents();
  if (!active) return;
  // Chromium decides URL vs. search (and the configured search provider).
  AutocompleteMatch match;
  AutocompleteClassifierFactory::GetForProfile(window_->GetProfile())
      ->Classify(base::UTF8ToUTF16(text), false, false,
                 metrics::OmniboxEventProto::OTHER, &match, nullptr);
  if (!match.destination_url.is_valid() || match.destination_url.SchemeIs("javascript")) return;
  NavigateParams params(window_, match.destination_url, ui::PAGE_TRANSITION_TYPED);
  params.disposition = WindowOpenDisposition::CURRENT_TAB;
  Navigate(&params);
}

void JustSlidePageHandler::GoBack() { if (auto* wc = model_->GetActiveWebContents(); wc && wc->GetController().CanGoBack()) wc->GetController().GoBack(); }
void JustSlidePageHandler::GoForward() { if (auto* wc = model_->GetActiveWebContents(); wc && wc->GetController().CanGoForward()) wc->GetController().GoForward(); }
void JustSlidePageHandler::Reload() { if (auto* wc = model_->GetActiveWebContents()) wc->GetController().Reload(content::ReloadType::NORMAL, true); }

void JustSlidePageHandler::ToggleSidebar() {
  PrefService* p = window_->GetProfile()->GetPrefs();
  p->SetBoolean(kPrefSidebarCollapsed, !p->GetBoolean(kPrefSidebarCollapsed));
  // JustSlideSidebarHost observes the pref and resizes to the rail width.
  ScheduleSnapshot();
}

void JustSlidePageHandler::SelectTab(const std::string& tab_id) {
  int i = IndexOfTab(tab_id);
  if (i != TabStripModel::kNoTab) model_->ActivateTabAt(i);  // user gesture from trusted UI
}
void JustSlidePageHandler::CreateTab() { chrome::ExecuteCommand(window_, IDC_NEW_TAB); }
void JustSlidePageHandler::CloseTab(const std::string& tab_id) {
  int i = IndexOfTab(tab_id);
  if (i != TabStripModel::kNoTab) model_->CloseWebContentsAt(i, TabCloseTypes::CLOSE_USER_GESTURE | TabCloseTypes::CLOSE_CREATE_HISTORICAL_TAB);
}
void JustSlidePageHandler::ReopenClosedTab() { chrome::ExecuteCommand(window_, IDC_RESTORE_TAB); }
void JustSlidePageHandler::SetTabPinned(const std::string& tab_id, bool pinned) {
  int i = IndexOfTab(tab_id);
  if (i != TabStripModel::kNoTab) model_->SetTabPinned(i, pinned);  // native pin invariants
}
void JustSlidePageHandler::MoveTab(const std::string& tab_id, int32_t delta) {
  int i = IndexOfTab(tab_id);
  if (i == TabStripModel::kNoTab || (delta != -1 && delta != 1)) return;
  int to = i + delta;
  // Never move across the pinned/unpinned boundary (TabStripModel invariant).
  if (to < 0 || to >= model_->count() || model_->IsTabPinned(i) != model_->IsTabPinned(to)) return;
  model_->MoveWebContentsAt(i, to, /*select_after_move=*/false);
}

void JustSlidePageHandler::SelectWorkspace(const std::string& workspace_id) {
  if (!workspaces_->Find(workspace_id)) return;
  selected_workspace_id_ = workspace_id;
  window_->GetProfile()->GetPrefs()->SetString(kPrefSelectedWorkspace, workspace_id);
  // Activate the first tab of the workspace (explicit user selection only).
  for (int i = 0; i < model_->count(); ++i) {
    auto* id = TabIdentity::FromWebContents(model_->GetWebContentsAt(i));
    if (id && id->workspace_id() == workspace_id) { model_->ActivateTabAt(i); break; }
  }
  ScheduleSnapshot();
}
void JustSlidePageHandler::CreateWorkspace(const std::string& name) {
  if (name.empty() || workspaces_->workspaces().size() >= WorkspaceService::kMaxWorkspaces) return;
  workspaces_->Create(name, WorkspaceIcon::kGeneric, /*agent_owned=*/false);
}
void JustSlidePageHandler::RenameWorkspace(const std::string& id, const std::string& name) {
  if (!name.empty()) workspaces_->Rename(id, name);
}
void JustSlidePageHandler::AddFavoriteForActiveTab() {
  if (auto* wc = model_->GetActiveWebContents()) workspaces_->AddFavorite(wc->GetLastCommittedURL(), wc->GetTitle());
}
void JustSlidePageHandler::RemoveFavorite(const std::string& id) { workspaces_->RemoveFavorite(id); }
void JustSlidePageHandler::MoveFavorite(const std::string& id, int32_t delta) { workspaces_->MoveFavorite(id, delta); }
void JustSlidePageHandler::OpenFavorite(const std::string& id) {
  if (auto f = workspaces_->FindFavorite(id)) {
    NavigateParams params(window_, f->url, ui::PAGE_TRANSITION_AUTO_BOOKMARK);
    params.disposition = WindowOpenDisposition::CURRENT_TAB;
    Navigate(&params);
  }
}

// Agent controls: routed to the automation layer once it is wired natively.
void JustSlidePageHandler::ResolvePendingRequest(const std::string&, bool) {}
void JustSlidePageHandler::SetAgentPaused(const std::string&, bool) {}
void JustSlidePageHandler::RevokeAgent(const std::string&) {}

void JustSlidePageHandler::SetColorMode(mojom::ColorMode mode) {
  window_->GetProfile()->GetPrefs()->SetInteger(kPrefColorMode, static_cast<int>(mode));
  ScheduleSnapshot();
}
void JustSlidePageHandler::SetBackdropColor(const std::string& hex) {
  const bool ok = hex.empty() || (hex.size() == 7 && hex[0] == '#' &&
                  std::all_of(hex.begin() + 1, hex.end(), [](char c) { return base::IsHexDigit(c); }));
  if (!ok) { receiver_.ReportBadMessage("invalid backdrop color"); return; }
  window_->GetProfile()->GetPrefs()->SetString(kPrefBackdropColor, hex);
  ScheduleSnapshot();
}
void JustSlidePageHandler::ShowPairingDialog() {}

void JustSlidePageHandler::OnTabStripModelChanged(TabStripModel*, const TabStripModelChange& change,
                                                  const TabStripSelectionChange&) {
  if (change.type() == TabStripModelChange::kInserted) {
    for (const auto& c : change.GetInsert()->contents) {
      // New tabs (user, extension, popup) join the selected workspace unless
      // they already carry an identity (agent-created / restored).
      TabIdentity::GetOrCreate(c.contents, selected_workspace_id_, OpenedBy::kUser);
    }
  }
  ScheduleSnapshot();
}
void JustSlidePageHandler::TabChangedAt(content::WebContents*, int, TabChangeType) { ScheduleSnapshot(); }
void JustSlidePageHandler::OnWorkspacesChanged() { ScheduleSnapshot(); }
void JustSlidePageHandler::OnFavoritesChanged() { ScheduleSnapshot(); }

}  // namespace justslide
