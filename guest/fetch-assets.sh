#!/usr/bin/env bash
# Download the third-party pieces the guest needs, into public/vm/.
# Run once after cloning: `bun run guest:fetch`.
#
# Everything this writes is gitignored — it is 8 MB of binaries that belong to
# other projects (v86, SeaBIOS, the buildroot kernel).
set -euo pipefail
cd "$(dirname "$0")/.."

V86_VERSION=0.5.458

mkdir -p public/vm guest/build

echo "==> v86 ${V86_VERSION} (libv86.js + v86.wasm)"
curl -sSL "https://registry.npmjs.org/v86/-/v86-${V86_VERSION}.tgz" -o guest/build/v86.tgz
tar -xzf guest/build/v86.tgz -C guest/build
cp guest/build/package/build/libv86.js guest/build/package/build/v86.wasm public/vm/
rm -rf guest/build/package guest/build/v86.tgz

echo "==> SeaBIOS + VGA BIOS"
for f in seabios.bin vgabios.bin; do
    curl -sSL "https://raw.githubusercontent.com/copy/v86/master/bios/$f" -o "public/vm/$f"
done

# Linux 5.6 at 5.17 MB rather than the 6.8 image at 10.07 MB. Same buildroot
# userland and 9p support, and the smaller initramfs drops the memory floor to
# 32 MB.
echo "==> buildroot kernel (Linux 5.6)"
curl -sSL "https://i.copy.sh/buildroot-bzimage.bin" -o public/vm/bzimage.bin

echo "==> done. Next: bun run guest:build"
