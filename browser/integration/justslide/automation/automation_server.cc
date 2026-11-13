// Copyright 2026 Bloxy Studios.
#include "justslide/automation/automation_server.h"

#include <unistd.h>

#include "base/files/file_util.h"
#include "base/files/important_file_writer.h"
#include "base/json/json_reader.h"
#include "base/json/json_writer.h"
#include "base/numerics/byte_conversions.h"
#include "base/task/single_thread_task_runner.h"
#include "chrome/browser/profiles/profile.h"
#include "content/public/browser/browser_task_traits.h"
#include "content/public/browser/browser_thread.h"
#include "justslide/automation/command_dispatcher.h"
#include "justslide/automation/grant_store.h"
#include "justslide/automation/protocol_constants.h"
#include "justslide/browser/tab_identity.h"
#include "justslide/common/justslide_constants.h"
#include "net/base/io_buffer.h"
#include "net/base/net_errors.h"
#include "net/socket/stream_socket.h"
#include "net/socket/unix_domain_server_socket_posix.h"

namespace justslide {
namespace {
constexpr size_t kMaxSunPath = 103;  // macOS sun_path is 104 incl. NUL

bool SamePeerUser(const net::UnixDomainServerSocket::Credentials& c) {
  return c.user_id == geteuid();
}
}  // namespace

// Lives on the IO thread. One Connection per accepted socket; each keeps a
// read loop (length prefix, then body), validates the envelope shape and
// forwards to the UI thread. Responses come back via PostTask.
class AutomationServer::Listener {
 public:
  Listener(base::WeakPtr<AutomationServer> owner, scoped_refptr<base::SingleThreadTaskRunner> ui)
      : owner_(owner), ui_(std::move(ui)),
        socket_(base::BindRepeating(&SamePeerUser), /*use_abstract_namespace=*/false) {}

  int Listen(const base::FilePath& path) {
    int rv = socket_.BindAndListen(path.value(), /*backlog=*/4);
    if (rv == net::OK) AcceptLoop();
    return rv;
  }

 private:
  void AcceptLoop() {
    int rv = socket_.Accept(&accepted_, base::BindOnce(&Listener::OnAccept, base::Unretained(this)));
    if (rv != net::ERR_IO_PENDING) OnAccept(rv);
  }
  void OnAccept(int rv) {
    if (rv == net::OK && accepted_) {
      // Connection objects implement: hello -> GrantStore::Authenticate on UI
      // thread -> welcome{instanceId, grantId, commands ∩ grant}; then the
      // request loop with per-connection semaphore and cancel frames.
      // (Implementation detail elided in this first authored slice; the wire
      // behaviour is specified by protocol/registry and exercised by
      // mcp/tests against the BrowserTestDouble.)
      connections_.push_back(std::move(accepted_));
    }
    AcceptLoop();
  }

  base::WeakPtr<AutomationServer> owner_;
  scoped_refptr<base::SingleThreadTaskRunner> ui_;
  net::UnixDomainServerSocket socket_;
  std::unique_ptr<net::StreamSocket> accepted_;
  std::vector<std::unique_ptr<net::StreamSocket>> connections_;
};

AutomationServer::AutomationServer(Profile* profile, const base::FilePath& user_data_dir)
    : dir_(user_data_dir.AppendASCII(kAutomationDirName)),
      instance_id_(TabIdentity::NewId("inst_")),
      grants_(std::make_unique<GrantStore>(profile->GetPrefs())),
      dispatcher_(std::make_unique<CommandDispatcher>(profile, grants_.get())) {}

AutomationServer::~AutomationServer() { Stop(); }

bool AutomationServer::Start() {
  if (!base::CreateDirectory(dir_) || !base::SetPosixFilePermissions(dir_, 0700)) return false;
  socket_path_ = dir_.AppendASCII("s-" + instance_id_.substr(5, 8) + ".sock");
  if (socket_path_.value().size() > kMaxSunPath) {
    base::FilePath tmp;
    if (!base::CreateNewTempDirectory("justslide-", &tmp) || !base::SetPosixFilePermissions(tmp, 0700)) return false;
    socket_path_ = tmp.AppendASCII("s.sock");
  }
  base::DeleteFile(socket_path_);  // stale socket from a crashed instance
  if (!io_thread_.StartWithOptions(base::Thread::Options(base::MessagePumpType::IO, 0))) return false;
  listener_ = std::unique_ptr<Listener, base::OnTaskRunnerDeleter>(
      new Listener(weak_factory_.GetWeakPtr(), content::GetUIThreadTaskRunner({})),
      base::OnTaskRunnerDeleter(io_thread_.task_runner()));
  io_thread_.task_runner()->PostTask(FROM_HERE, base::BindOnce(
      [](Listener* l, base::FilePath sock, base::FilePath dir, std::string instance) {
        if (l->Listen(sock) != net::OK) return;
        base::SetPosixFilePermissions(sock, 0600);
        std::string json;
        base::JSONWriter::Write(base::Value::Dict().Set("protocol", protocol::kProtocolName)
            .Set("protocolVersion", protocol::kProtocolVersion).Set("instanceId", instance)
            .Set("socket", sock.value()).Set("pid", static_cast<int>(getpid())), &json);
        base::FilePath ep = dir.AppendASCII("endpoint.json");
        if (base::ImportantFileWriter::WriteFileAtomically(ep, json)) base::SetPosixFilePermissions(ep, 0600);
      }, listener_.get(), socket_path_, dir_, instance_id_));
  return true;
}

void AutomationServer::Stop() {
  listener_.reset();
  io_thread_.Stop();
  base::DeleteFile(dir_.AppendASCII("endpoint.json"));
  if (!socket_path_.empty()) base::DeleteFile(socket_path_);
}

}  // namespace justslide
