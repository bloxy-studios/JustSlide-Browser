// Copyright 2026 Bloxy Studios.
#include "justslide/browser/tab_identity.h"

#include "base/base32.h"
#include "base/rand_util.h"
#include "base/strings/string_util.h"
#include "components/sessions/content/content_serialized_navigation_driver.h"
#include "components/sessions/content/extended_info_handler.h"
#include "content/public/browser/navigation_controller.h"
#include "content/public/browser/navigation_entry.h"
#include "content/public/browser/web_contents.h"
#include "justslide/common/justslide_constants.h"

namespace justslide {
namespace {

// Per-NavigationEntry storage of a string under `key` (NavigationEntry user
// data is not persisted; extended info is the persisted channel).
class StringHandler : public sessions::ExtendedInfoHandler {
 public:
  explicit StringHandler(const char* key) : key_(key) {}
  std::string GetExtendedInfo(content::NavigationEntry* entry) const override {
    std::u16string value;
    return entry->GetExtraData(key_, &value) ? base::UTF16ToUTF8(value) : std::string();
  }
  void RestoreExtendedInfo(const std::string& info,
                           content::NavigationEntry* entry) override {
    // Accept only our own id shapes from disk (data may be from an older or
    // corrupted session file).
    if (info.size() <= 40 && base::IsStringASCII(info) &&
        (info.starts_with("tab_") || info.starts_with("ws_"))) {
      entry->SetExtraData(key_, base::UTF8ToUTF16(info));
    }
  }
 private:
  const char* key_;
};

std::string ReadRestored(content::WebContents* contents, const char* key) {
  content::NavigationEntry* entry = contents->GetController().GetLastCommittedEntry();
  if (!entry) entry = contents->GetController().GetPendingEntry();
  std::u16string value;
  return entry && entry->GetExtraData(key, &value) ? base::UTF16ToUTF8(value) : std::string();
}

}  // namespace

// static
std::string TabIdentity::NewId(const char* prefix) {
  std::string raw = base::RandBytesAsString(10);
  std::string enc = base::ToLowerASCII(base::Base32Encode(base::as_byte_span(raw), base::Base32EncodePolicy::OMIT_PADDING));
  return std::string(prefix) + enc;  // e.g. tab_mzxw6ytboi...
}

// static
void TabIdentity::RegisterSessionPersistence() {
  auto* driver = sessions::ContentSerializedNavigationDriver::GetInstance();
  driver->RegisterExtendedInfoHandler(kExtendedInfoTabId, std::make_unique<StringHandler>(kExtendedInfoTabId));
  driver->RegisterExtendedInfoHandler(kExtendedInfoWorkspaceId, std::make_unique<StringHandler>(kExtendedInfoWorkspaceId));
}

// static
TabIdentity* TabIdentity::GetOrCreate(content::WebContents* contents,
                                      const std::string& fallback_workspace_id,
                                      OpenedBy opened_by) {
  if (auto* existing = FromWebContents(contents)) return existing;
  std::string tab_id = ReadRestored(contents, kExtendedInfoTabId);
  std::string ws = ReadRestored(contents, kExtendedInfoWorkspaceId);
  OpenedBy by = opened_by;
  if (!tab_id.empty()) by = OpenedBy::kRestore; else tab_id = NewId("tab_");
  if (ws.empty()) ws = fallback_workspace_id;
  contents->SetUserData(UserDataKey(), base::WrapUnique(new TabIdentity(contents, tab_id, ws, by)));
  return FromWebContents(contents);
}

TabIdentity::TabIdentity(content::WebContents* contents, std::string tab_id,
                         std::string workspace_id, OpenedBy opened_by)
    : content::WebContentsUserData<TabIdentity>(*contents),
      tab_id_(std::move(tab_id)),
      workspace_id_(std::move(workspace_id)),
      opened_by_(opened_by),
      navigation_id_("nav_0") {
  MirrorToNavigationEntries();
}

TabIdentity::~TabIdentity() = default;

void TabIdentity::SetWorkspace(const std::string& workspace_id) {
  workspace_id_ = workspace_id;
  MirrorToNavigationEntries();
}

void TabIdentity::ReassignIdForDuplicate() {
  tab_id_ = NewId("tab_");
  MirrorToNavigationEntries();
}

void TabIdentity::OnPrimaryNavigationCommitted() {
  navigation_id_ = "nav_" + base::NumberToString(++navigation_counter_);
  MirrorToNavigationEntries();
}

void TabIdentity::MirrorToNavigationEntries() {
  auto& controller = GetWebContents().GetController();
  for (int i = 0; i < controller.GetEntryCount(); ++i) {
    content::NavigationEntry* e = controller.GetEntryAtIndex(i);
    e->SetExtraData(kExtendedInfoTabId, base::UTF8ToUTF16(tab_id_));
    e->SetExtraData(kExtendedInfoWorkspaceId, base::UTF8ToUTF16(workspace_id_));
  }
}

WEB_CONTENTS_USER_DATA_KEY_IMPL(TabIdentity);

}  // namespace justslide
