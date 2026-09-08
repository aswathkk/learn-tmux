#!/usr/bin/env bash
# Build the Alpine + tmux rootfs into the v86 9p filesystem format.
#
#   public/vm/fs.json     directory tree metadata
#   public/vm/rootfs/     file contents, one file per sha256 prefix
#
# Needs Docker with linux/386 emulation (Docker Desktop has it by default).
# The two conversion steps are TypeScript ports of v86's own Python tools, so
# Bun is the only other requirement.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE=learntmux-rootfs
TAR=guest/build/rootfs.tar

mkdir -p guest/build public/vm/rootfs

echo "==> docker build (linux/386)"
docker build --platform linux/386 -t "$IMAGE" guest

echo "==> exporting container filesystem"
cid=$(docker create --platform linux/386 "$IMAGE" /bin/true)
trap 'docker rm -f "$cid" >/dev/null 2>&1 || true' EXIT
docker export "$cid" -o "$TAR"
docker rm "$cid" >/dev/null
trap - EXIT

echo "==> fs2json"
bun run guest/tools/fs2json.ts --out public/vm/fs.json "$TAR"

echo "==> copy-to-sha256"
rm -rf public/vm/rootfs
mkdir -p public/vm/rootfs
bun run guest/tools/copy-to-sha256.ts "$TAR" public/vm/rootfs

echo "==> done"
du -sh public/vm/rootfs public/vm/fs.json
echo "files: $(ls public/vm/rootfs | wc -l | tr -d ' ')"
echo
echo "The snapshot embeds 9p inode metadata, so it is now stale."
echo "Regenerate it: bun run guest:state"
