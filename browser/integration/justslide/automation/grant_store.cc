// Copyright 2026 Bloxy Studios.
#include "justslide/automation/grant_store.h"

#include "base/base64url.h"
#include "base/rand_util.h"
#include "base/strings/string_number_conversions.h"
#include "components/prefs/pref_service.h"
#include "components/prefs/scoped_user_pref_update.h"
#include "crypto/hash.h"
#include "crypto/secure_util.h"
#include "justslide/browser/tab_identity.h"
#include "justslide/common/justslide_constants.h"

namespace justslide {
namespace {
std::string HashHex(std::string_view token) {
  auto digest = crypto::hash::Sha256(base::as_byte_span(token));
  return base::HexEncode(digest);
}
std::set<std::string> ToSet(const base::Value::List* l) {
  std::set<std::string> s;
  if (l) for (const auto& v : *l) if (v.is_string()) s.insert(v.GetString());
  return s;
}
base::Value::List ToList(const std::set<std::string>& s) {
  base::Value::List l; for (const auto& x : s) l.Append(x); return l;
}
}  // namespace

GrantStore::GrantStore(PrefService* prefs) : prefs_(prefs) {}
GrantStore::~GrantStore() = default;

std::vector<Grant> GrantStore::All() const {
  std::vector<Grant> out;
  for (const auto [id, v] : prefs_->GetDict(kPrefGrants)) {
    const base::Value::Dict* d = v.GetIfDict();
    if (!d) continue;
    Grant g;
    g.grant_id = id;
    if (auto* s = d->FindString("client")) g.client_name = *s;
    if (auto* s = d->FindString("token_sha256")) g.token_sha256_hex = *s;
    g.workspace_ids = ToSet(d->FindList("workspaces"));
    g.operations = ToSet(d->FindList("operations"));
    g.paused = d->FindBool("paused").value_or(false);
    g.revoked = d->FindBool("revoked").value_or(false);
    g.expires_unix = static_cast<int64_t>(d->FindDouble("expires").value_or(0));
    out.push_back(std::move(g));
  }
  return out;
}

void GrantStore::Save(const std::vector<Grant>& grants) {
  ScopedDictPrefUpdate u(prefs_, kPrefGrants);
  u->clear();
  for (const auto& g : grants) {
    u->Set(g.grant_id, base::Value::Dict()
        .Set("client", g.client_name).Set("token_sha256", g.token_sha256_hex)
        .Set("workspaces", ToList(g.workspace_ids)).Set("operations", ToList(g.operations))
        .Set("paused", g.paused).Set("revoked", g.revoked).Set("expires", double(g.expires_unix)));
  }
}

std::optional<Grant> GrantStore::Authenticate(std::string_view token, int64_t now) const {
  if (token.size() < 43 || token.size() > 128) return std::nullopt;
  const std::string h = HashHex(token);
  std::optional<Grant> match;
  for (auto& g : All()) {
    // Compare every record in constant time to avoid timing oracles.
    if (g.token_sha256_hex.size() == h.size() &&
        crypto::SecureMemEqual(g.token_sha256_hex.data(), h.data(), h.size())) match = g;
  }
  if (!match || match->revoked || (match->expires_unix && match->expires_unix < now)) return std::nullopt;
  return match;
}

std::string GrantStore::CreatePairing(const std::string& client, std::set<std::string> ops) {
  std::string token;
  base::Base64UrlEncode(base::RandBytesAsString(32), base::Base64UrlEncodePolicy::OMIT_PADDING, &token);
  auto grants = All();
  grants.push_back({TabIdentity::NewId("grant_"), client.substr(0, 64), HashHex(token), {}, std::move(ops)});
  Save(grants);
  return token;  // 43 chars; caller shows it once and stores it in Keychain
}

void GrantStore::AddWorkspace(const std::string& id, const std::string& ws) {
  auto g = All(); for (auto& x : g) if (x.grant_id == id) x.workspace_ids.insert(ws); Save(g);
}
void GrantStore::SetPaused(const std::string& id, bool p) {
  auto g = All(); for (auto& x : g) if (x.grant_id == id) x.paused = p; Save(g);
}
void GrantStore::Revoke(const std::string& id) {
  auto g = All(); for (auto& x : g) if (x.grant_id == id) { x.revoked = true; x.workspace_ids.clear(); } Save(g);
}

}  // namespace justslide
