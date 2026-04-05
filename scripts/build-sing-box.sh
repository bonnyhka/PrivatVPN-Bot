#!/bin/bash
set -e

echo "Ensuring Go is installed..."
if ! command -v go &> /dev/null; then
    echo "Installing Go..."
    wget -q https://go.dev/dl/go1.22.1.linux-amd64.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf go1.22.1.linux-amd64.tar.gz
    rm go1.22.1.linux-amd64.tar.gz
fi

export PATH=$PATH:/usr/local/go/bin

echo "Cloning sing-box (v1.11.1)..."
rm -rf /tmp/sing-box-build
git clone -b v1.11.1 https://github.com/SagerNet/sing-box.git /tmp/sing-box-build
cd /tmp/sing-box-build

echo "Compiling sing-box with v2ray_api..."
go build -tags with_gvisor,with_quic,with_dhcp,with_wireguard,with_ech,with_utls,with_reality_server,with_clash_api,with_v2ray_api -v -o /root/sing-box-custom ./cmd/sing-box

echo "Build complete: /root/sing-box-custom"
/root/sing-box-custom version
