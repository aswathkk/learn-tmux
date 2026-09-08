# The guest root filesystem: Alpine i386 with tmux, and nothing else that matters.
#
# Build context is the guest/ directory (see build.sh), so the overlay below is
# copied from guest/rootfs.
#
# 32-bit on purpose: v86 emulates a 586-class CPU, so the whole guest has to be
# i386. On Apple Silicon, Docker runs this through binfmt emulation.
FROM --platform=linux/386 i386/alpine:3.19

# tmux links only musl, libncursesw and libevent_core; ncurses-terminfo-base
# supplies the TERM entries it needs. busybox already provides clear/reset and
# vi, so the full ncurses and vim packages are not installed.
RUN apk add --no-cache tmux ncurses-terminfo-base

# Everything the guest never links. The package manager, OpenSSL and the CA
# bundle alone were about half the exported filesystem, and nothing here can
# reach a network anyway. This is what took the rootfs from 7.94 MB to 2.82 MB.
RUN rm -rf \
        /sbin/apk /etc/apk /lib/apk /usr/share/apk /var/cache/apk \
        /lib/libapk.so.* \
        /lib/libcrypto.so.* /lib/libssl.so.* /usr/lib/ossl-modules \
        /etc/ssl /etc/ssl1.1 /usr/bin/ssl_client \
        /usr/bin/scanelf /usr/share/tabset \
        /usr/lib/engines-3 /lib/libz.so.* \
        /usr/lib/libevent-2.1.so.* \
        /usr/lib/libevent_extra-*.so.* \
        /usr/lib/libevent_openssl-*.so.* \
        /usr/lib/libevent_pthreads-*.so.*

# The lessons address /home/alpine and assume an ordinary user account.
RUN adduser -D -h /home/alpine -s /bin/sh alpine

# Mount points the boot script binds into before chroot.
RUN mkdir -p /proc /sys /tmp /run /dev/pts

COPY rootfs/ /

RUN chmod +x /v86-boot.sh /usr/local/bin/start-tmux /usr/local/bin/open \
    && chown -R alpine:alpine /home/alpine
