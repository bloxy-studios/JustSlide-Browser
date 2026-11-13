#!/usr/bin/env bash
# Assert the built app carries JustSlide identity and an isolated product dir.
source "$(dirname "$0")/../lib.sh"
cfg="${1:-dev}"; cpu="${2:-$(host_cpu)}"; out="$CR_SRC/out/$cfg-$cpu"
[[ "$(uname -s)" == Darwin ]] || die "macOS only"
app=$(ls -d "$out"/*.app | head -1); plist="$app/Contents/Info.plist"
id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$plist"); dir=$(/usr/libexec/PlistBuddy -c 'Print :CrProductDirName' "$plist")
[[ "$id" == app.justslide.JustSlide.dev ]] || die "bundle id $id"
[[ "$dir" == "JustSlide Dev" ]] || die "CrProductDirName $dir"
lipo -archs "$app/Contents/MacOS/"* | tee /dev/stderr | grep -qw "$( [[ $cpu == x64 ]] && echo x86_64 || echo arm64 )" || die "binary arch mismatch"
info "identity ok: $id, product dir '$dir', arch $cpu"
