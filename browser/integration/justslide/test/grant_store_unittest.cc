// Copyright 2026 Bloxy Studios.
#include "justslide/automation/grant_store.h"

#include "components/prefs/testing_pref_service.h"
#include "justslide/browser/workspace_service.h"
#include "testing/gtest/include/gtest/gtest.h"

namespace justslide {

class GrantStoreTest : public testing::Test {
 protected:
  void SetUp() override { WorkspaceService::RegisterProfilePrefs(prefs_.registry()); }
  TestingPrefServiceSimple prefs_;
};

TEST_F(GrantStoreTest, TokenAuthenticatesAndIsNotStored) {
  GrantStore s(&prefs_);
  std::string token = s.CreatePairing("cursor", {"read.metadata"});
  EXPECT_GE(token.size(), 43u);
  ASSERT_TRUE(s.Authenticate(token, 0).has_value());
  EXPECT_EQ(prefs_.GetDict("justslide.automation.grants").DebugString().find(token), std::string::npos);
  EXPECT_FALSE(s.Authenticate(token + "x", 0).has_value());
}

TEST_F(GrantStoreTest, RevocationBlocksFutureAuthentication) {
  GrantStore s(&prefs_);
  std::string token = s.CreatePairing("cursor", {"write.organize"});
  auto g = s.Authenticate(token, 0);
  ASSERT_TRUE(g);
  s.Revoke(g->grant_id);
  EXPECT_FALSE(s.Authenticate(token, 0).has_value());
}

}  // namespace justslide
