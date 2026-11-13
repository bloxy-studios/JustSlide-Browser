// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_BROWSER_WORKSPACE_SERVICE_FACTORY_H_
#define JUSTSLIDE_BROWSER_WORKSPACE_SERVICE_FACTORY_H_

#include "base/no_destructor.h"
#include "chrome/browser/profiles/profile_keyed_service_factory.h"

namespace justslide {
class WorkspaceService;

class WorkspaceServiceFactory : public ProfileKeyedServiceFactory {
 public:
  static WorkspaceService* GetForBrowserContext(content::BrowserContext* context);
  static WorkspaceServiceFactory* GetInstance();

 private:
  friend base::NoDestructor<WorkspaceServiceFactory>;
  WorkspaceServiceFactory();
  ~WorkspaceServiceFactory() override;
  std::unique_ptr<KeyedService> BuildServiceInstanceForBrowserContext(
      content::BrowserContext* context) const override;
  void RegisterProfilePrefs(user_prefs::PrefRegistrySyncable* registry) override;
};
}  // namespace justslide

#endif  // JUSTSLIDE_BROWSER_WORKSPACE_SERVICE_FACTORY_H_
