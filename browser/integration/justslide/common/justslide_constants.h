// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_COMMON_JUSTSLIDE_CONSTANTS_H_
#define JUSTSLIDE_COMMON_JUSTSLIDE_CONSTANTS_H_

namespace justslide {

// Trusted top-chrome WebUI hosting the sidebar. `.top-chrome` hosts are only
// meant to be embedded by browser UI; see JustSlideSidebarUIConfig for the
// navigation restrictions that keep it out of ordinary tabs.
inline constexpr char kSidebarHost[] = "justslide-sidebar.top-chrome";
inline constexpr char kSidebarURL[] = "chrome://justslide-sidebar.top-chrome/";

// Profile prefs (registered by WorkspaceServiceFactory).
inline constexpr char kPrefWorkspaces[] = "justslide.workspaces";
inline constexpr char kPrefSelectedWorkspace[] = "justslide.selected_workspace";
inline constexpr char kPrefColorMode[] = "justslide.color_mode";
inline constexpr char kPrefBackdropColor[] = "justslide.backdrop_color";
inline constexpr char kPrefSidebarCollapsed[] = "justslide.sidebar_collapsed";
inline constexpr char kPrefGrants[] = "justslide.automation.grants";

// NavigationEntry extended-info keys persisted by session restore.
inline constexpr char kExtendedInfoTabId[] = "justslide_tab_id";
inline constexpr char kExtendedInfoWorkspaceId[] = "justslide_workspace_id";

// Bookmark folder that backs the favorites grid (profile-wide).
inline constexpr char16_t kFavoritesFolderTitle[] = u"JustSlide Favorites";

// Directory (inside the user-data dir) holding endpoint.json and the socket.
inline constexpr char kAutomationDirName[] = "JustSlideAutomation";

}  // namespace justslide

#endif  // JUSTSLIDE_COMMON_JUSTSLIDE_CONSTANTS_H_
