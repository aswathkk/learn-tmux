#!/usr/bin/env bash
# Upload the built guest machine to R2, where the site serves it from.
#
#   bun run guest:publish
#
# Keys mirror public/vm/ exactly, under a vm/ prefix: public/vm/state.bin.zst
# becomes vm/state.bin.zst. functions/vm/[[path]].ts reads them back.
#
# Run after guest:build and guest:state. Needs `wrangler login`.
#
# This is additive. build.sh rewrites rootfs/ from scratch, so blobs from an
# earlier generation stay in the bucket unreferenced — 2.8 MB a rebuild, which
# is not worth automating a delete for. Clear them by hand if it ever matters:
#   bunx wrangler r2 object delete learntmux/vm/rootfs/<name> --remote
set -euo pipefail
cd "$(dirname "$0")/.."

BUCKET=${R2_BUCKET:-learntmux}
SRC=public/vm
JOBS=8

if [ ! -f "$SRC/state.bin.zst" ]; then
    echo "no $SRC/state.bin.zst — run 'bun run guest:build' then 'bun run guest:state' first" >&2
    exit 1
fi

# The content type each object is stored with. The Pages Function sets these on
# the way out too and is what actually decides them; storing them here keeps the
# objects honest if the bucket is ever read by anything else.
#
# Nothing sets Content-Encoding, and nothing may: state.bin.zst is zstd that
# libv86 inflates itself, and a transport that inflates it first hands libv86 a
# raw state under a name that makes it try again.
content_type() {
    case "$1" in
        *.wasm) echo 'application/wasm' ;;
        *.js)   echo 'text/javascript' ;;
        *.json) echo 'application/json' ;;
        *)      echo 'application/octet-stream' ;;
    esac
}
export -f content_type

upload() {
    local file="$1" bucket="$2" src="$3"
    local key="vm/${file#"$src/"}"
    bunx wrangler r2 object put "$bucket/$key" \
        --file "$file" \
        --content-type "$(content_type "$file")" \
        --remote >/dev/null
    echo "  $key"
}
export -f upload

count=$(find "$SRC" -type f | wc -l | tr -d ' ')
echo "==> uploading $count files to r2://$BUCKET/vm/ ($JOBS at a time)"

find "$SRC" -type f -print0 |
    xargs -0 -P "$JOBS" -I{} bash -c 'upload "$@"' _ {} "$BUCKET" "$SRC"

echo "==> done"
