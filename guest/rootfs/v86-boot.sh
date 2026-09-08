#!/bin/sh
# Runs inside the v86 buildroot initramfs shell.
# The Alpine rootfs (this 9p filesystem) is already mounted at /mnt.
# Usage: sh /mnt/v86-boot.sh <cols> <rows>
R=/mnt

# This script lives on the share it is about to remount, so run from a copy.
case "$0" in
    "$R"/*) cp "$0" /tmp/v86-boot.sh && exec sh /tmp/v86-boot.sh "$@" ;;
esac

# The buildroot init mounts the share with no caching at all, so every read
# goes back out to the browser and v86 re-downloads the whole file each time:
# 7.4 MB of traffic for a 2.8 MB rootfs. Loose caching brings it down to one
# fetch per file.
if umount "$R" 2>/dev/null; then
    mount -t 9p -o trans=virtio,version=9p2000.L,access=client,cache=loose \
          host9p "$R" 2>/dev/null
fi

mount -t proc     proc     "$R/proc"     2>/dev/null
mount -t sysfs    sysfs    "$R/sys"      2>/dev/null
mount -t devtmpfs devtmpfs "$R/dev"      2>/dev/null
# devtmpfs hides the image's /dev, so the pts mountpoint is recreated here.
mkdir -p "$R/dev/pts"
mount -t devpts devpts "$R/dev/pts" -o gid=5,mode=620,ptmxmode=0666 2>/dev/null
# tmux needs a real filesystem for its unix socket; 9p cannot host one.
mount -t tmpfs    tmpfs    "$R/tmp"      2>/dev/null
mount -t tmpfs    tmpfs    "$R/run"      2>/dev/null
chmod 1777 "$R/tmp"

exec chroot "$R" /usr/local/bin/start-tmux "$@"
