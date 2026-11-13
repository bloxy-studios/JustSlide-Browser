// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_AUTOMATION_AUTOMATION_SERVER_H_
#define JUSTSLIDE_AUTOMATION_AUTOMATION_SERVER_H_

#include <memory>
#include "base/files/file_path.h"
#include "base/memory/weak_ptr.h"
#include "base/threading/thread.h"

class Profile;

namespace justslide {

class CommandDispatcher;
class GrantStore;

// Local, authenticated automation endpoint (no TCP port, no CDP).
//
//  * Socket: AF_UNIX at <user-data>/JustSlideAutomation/s-<instance>.sock
//    (dir 0700, socket 0600). If the path would exceed sun_path, falls back
//    to a 0700 per-instance dir under the per-user temp dir.
//  * Peer check: net::UnixDomainServerSocket AuthCallback rejects peers whose
//    uid differs from the browser's euid.
//  * Handshake: first frame must be `hello` with a pairing token; GrantStore
//    authenticates it (SHA-256, constant-time). Identity = the grant.
//  * Framing: u32 BE length + JSON, max kMaxFrameBytes in, results up to
//    kMaxResultFrameBytes; at most kMaxConcurrentRequestsPerConnection.
//  * Discovery: endpoint.json (0600) written atomically after listen();
//    removed on shutdown. Multiple instances = distinct instance ids/paths.
//  * Network/socket work runs on a dedicated IO thread; commands hop to the
//    UI thread and run in CommandDispatcher.
class AutomationServer {
 public:
  AutomationServer(Profile* agent_profile, const base::FilePath& user_data_dir);
  ~AutomationServer();
  bool Start();
  void Stop();
  const std::string& instance_id() const { return instance_id_; }

 private:
  class Listener;
  base::FilePath dir_;
  base::FilePath socket_path_;
  std::string instance_id_;
  std::unique_ptr<GrantStore> grants_;
  std::unique_ptr<CommandDispatcher> dispatcher_;
  base::Thread io_thread_{"JustSlideAutomationIO"};
  std::unique_ptr<Listener, base::OnTaskRunnerDeleter> listener_{nullptr, base::OnTaskRunnerDeleter(nullptr)};
  base::WeakPtrFactory<AutomationServer> weak_factory_{this};
};

}  // namespace justslide

#endif  // JUSTSLIDE_AUTOMATION_AUTOMATION_SERVER_H_
