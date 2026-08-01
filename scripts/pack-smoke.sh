#!/usr/bin/env bash

set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_root="$(mktemp -d "${TMPDIR:-/tmp}/beautiful-mermaid-packtest.XXXXXX")"
pack_dir="$temp_root/packed"
dependency_pack_dir="$temp_root/dependencies"
consumer_dir="$temp_root/consumer"

cleanup() {
  rm -rf "$temp_root"
}

trap cleanup EXIT INT TERM

mkdir -p "$pack_dir" "$dependency_pack_dir" "$consumer_dir"
export npm_config_cache="$temp_root/npm-cache"

echo "[packtest] Building and packing beautiful-mermaid from $repo_root"
(
  cd "$repo_root"
  npm run build
  npm pack --pack-destination "$pack_dir"
)

package_tarballs=("$pack_dir"/*.tgz)
if [[ ${#package_tarballs[@]} -ne 1 || ! -f "${package_tarballs[0]}" ]]; then
  echo "[packtest] ERROR: expected exactly one package tarball in $pack_dir" >&2
  exit 1
fi
package_tarball="${package_tarballs[0]}"

echo "[packtest] Packing already-installed runtime dependencies for offline installation"
npm pack --ignore-scripts --pack-destination "$dependency_pack_dir" \
  "$repo_root/node_modules/elkjs" \
  "$repo_root/node_modules/entities"

dependency_tarballs=("$dependency_pack_dir"/*.tgz)
if [[ ${#dependency_tarballs[@]} -ne 2 ]]; then
  echo "[packtest] ERROR: expected two runtime dependency tarballs in $dependency_pack_dir" >&2
  exit 1
fi

echo "[packtest] Creating isolated Node consumer in $consumer_dir"
(
  cd "$consumer_dir"
  npm init --yes >/dev/null
  npm install --offline --no-audit --no-fund \
    "$package_tarball" \
    "${dependency_tarballs[@]}"
  cp "$repo_root/packtest/consume.mjs" ./consume.mjs

  echo "[packtest] Running Node's native test runner against $(basename "$package_tarball")"
  node --test consume.mjs
)

echo "[packtest] Packed-package smoke test passed"
