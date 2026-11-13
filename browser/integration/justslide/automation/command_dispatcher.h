// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_AUTOMATION_COMMAND_DISPATCHER_H_
#define JUSTSLIDE_AUTOMATION_COMMAND_DISPATCHER_H_

#include "base/functional/callback.h"
#include "base/values.h"
#include "justslide/automation/grant_store.h"

class Profile;

namespace justslide {

// Executes one validated protocol request on the UI thread for an
// authenticated grant. Identity comes from `grant` (resolved from the socket
// peer + pairing token), never from request fields. Results are sanitized:
// tabs/workspaces outside the grant are invisible (`not_found`, not
// `permission_denied`, to avoid leaking existence).
class CommandDispatcher {
 public:
  using Reply = base::OnceCallback<void(base::Value::Dict response)>;
  CommandDispatcher(Profile* agent_profile, GrantStore* grants);
  ~CommandDispatcher();

  // Commands this build implements (intersected with the grant in welcome).
  static std::vector<std::string> ImplementedCommands();

  void Dispatch(const Grant& grant, const base::Value::Dict& request, Reply reply);
  void Cancel(const std::string& request_id);

 private:
  raw_ptr<Profile> profile_;
  raw_ptr<GrantStore> grants_;
  // request-id dedupe for `request-id` idempotency (bounded LRU).
  base::flat_map<std::string, base::Value::Dict> recent_results_;
};

}  // namespace justslide

#endif  // JUSTSLIDE_AUTOMATION_COMMAND_DISPATCHER_H_
