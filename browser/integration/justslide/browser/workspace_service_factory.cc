// Copyright 2026 Bloxy Studios.
#include "justslide/browser/workspace_service_factory.h"

#include "chrome/browser/bookmarks/bookmark_model_factory.h"
#include "chrome/browser/profiles/profile.h"
#include "components/pref_registry/pref_registry_syncable.h"
#include "justslide/browser/workspace_service.h"

namespace justslide {

// static
WorkspaceService* WorkspaceServiceFactory::GetForBrowserContext(content::BrowserContext* context) {
  return static_cast<WorkspaceService*>(GetInstance()->GetServiceForBrowserContext(context, /*create=*/true));
}

// static
WorkspaceServiceFactory* WorkspaceServiceFactory::GetInstance() {
  static base::NoDestructor<WorkspaceServiceFactory> instance;
  return instance.get();
}

// Off-the-record (private) profiles get their own instance so private
// workspaces/selection never touch the regular profile's prefs.
WorkspaceServiceFactory::WorkspaceServiceFactory()
    : ProfileKeyedServiceFactory("JustSlideWorkspaceService",
                                 ProfileSelections::Builder()
                                     .WithRegular(ProfileSelection::kOwnInstance)
                                     .WithGuest(ProfileSelection::kOwnInstance)
                                     .Build()) {
  DependsOn(BookmarkModelFactory::GetInstance());
}
WorkspaceServiceFactory::~WorkspaceServiceFactory() = default;

std::unique_ptr<KeyedService> WorkspaceServiceFactory::BuildServiceInstanceForBrowserContext(
    content::BrowserContext* context) const {
  Profile* profile = Profile::FromBrowserContext(context);
  // Agent-isolated profiles are created by the automation layer with a
  // recognisable profile directory name prefix.
  const bool agent = profile->GetBaseName().MaybeAsASCII().starts_with("JustSlideAgent");
  return std::make_unique<WorkspaceService>(
      profile->GetPrefs(), BookmarkModelFactory::GetForBrowserContext(context),
      agent ? ProfileKind::kAgentIsolated : ProfileKind::kPersonal);
}

void WorkspaceServiceFactory::RegisterProfilePrefs(user_prefs::PrefRegistrySyncable* registry) {
  WorkspaceService::RegisterProfilePrefs(registry);
}

}  // namespace justslide
