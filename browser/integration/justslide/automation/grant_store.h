// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_AUTOMATION_GRANT_STORE_H_
#define JUSTSLIDE_AUTOMATION_GRANT_STORE_H_

#include <optional>
#include <set>
#include <string>
#include <vector>

class PrefService;

namespace justslide {

// A grant binds one paired local client to explicit scopes. Created only by
// the human through trusted UI (pairing dialog); never by the protocol.
struct Grant {
  std::string grant_id;
  std::string client_name;
  std::string token_sha256_hex;        // token itself is never stored
  std::set<std::string> workspace_ids; // agent-created workspaces are added
  std::set<std::string> operations;    // e.g. read.metadata, write.organize
  bool paused = false;
  bool revoked = false;
  int64_t expires_unix = 0;            // 0 = no expiry
};

class GrantStore {
 public:
  explicit GrantStore(PrefService* prefs);
  ~GrantStore();

  // Constant-time comparison of SHA-256(token) against stored hashes.
  std::optional<Grant> Authenticate(std::string_view token, int64_t now_unix) const;
  // Returns the new token (shown once to the user, then stored in Keychain).
  std::string CreatePairing(const std::string& client_name, std::set<std::string> operations);
  void AddWorkspace(const std::string& grant_id, const std::string& workspace_id);
  void SetPaused(const std::string& grant_id, bool paused);
  void Revoke(const std::string& grant_id);
  std::vector<Grant> All() const;

 private:
  void Save(const std::vector<Grant>& grants);
  raw_ptr<PrefService> prefs_;
};

}  // namespace justslide

#endif  // JUSTSLIDE_AUTOMATION_GRANT_STORE_H_
