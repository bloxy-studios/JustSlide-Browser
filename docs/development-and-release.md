# Development & release

## Environments
| Host | Use |
|---|---|
| Linux/any (this sandbox, CI) | UI, protocol, MCP bridge, patch verification, preview evidence |
| macOS arm64 (Apple Silicon) | native arm64 dev/release builds |
| macOS x64 (Intel) | native x64 builds; or cross-build x64 from arm64 (`target_cpu="x64"`) |
The authoring sandbox was **Linux x86_64, 2 vCPU, 4 GB RAM, 24–28 GB free** — insufficient for any Chromium build (Linux validation also not practical). The founder's Mac architecture is unknown: run `bun run doctor:engine` and record it.

## Architectures
Build `dev-<cpu>`/`release-<cpu>` per CPU. Per docs/mac_arm64.md at the pin, Intel Macs can cross-build arm64 by setting `target_cpu="arm64"`. A universal binary (lipo of two release builds + helpers + frameworks) is **not produced** and not claimed; it needs its own packaging step and verification.

## CI
Hosted (`.github/workflows/ci.yml`): fast checks only. Native: self-hosted macOS runner (≥ 32 GB RAM, ≥ 250 GB SSD, Xcode with SDK ≥ 27.0), manual trigger, ccache/siso local cache — described, **not provisioned**.

## Packaging (current)
`scripts/engine/package.sh` → unsigned `.zip` + provenance JSON (lock, patch hashes, GN args, UI manifest, host/Xcode). No signing, notarization, publishing or certificates.

## Release gates (none met yet)
Native build + tests green on both CPUs · Developer ID signing incl. helpers + hardened runtime entitlements · notarization · sandbox/helper verification · privacy usage strings · license notices (Chromium + ADS + fonts) · ADS/font rights resolved · authenticated update channel (engine security updates ≠ UI updates) · baseline perf comparison.
