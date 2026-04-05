#!/bin/bash
set -e

VERSION="1.11.1"
ARCH="linux-amd64"
URL="https://github.com/SagerNet/sing-box/releases/download/v${VERSION}/sing-box-${VERSION}-${ARCH}.tar.gz"

echo "Downloading Sing-box v${VERSION}..."
curl -Lo /tmp/sing-box.tar.gz ${URL}

echo "Extracting..."
tar -xzf /tmp/sing-box.tar.gz -C /tmp/

echo "Installing binary..."
cp /tmp/sing-box-${VERSION}-${ARCH}/sing-box /usr/bin/sing-box
chmod +x /usr/bin/sing-box

echo "Sing-box version:"
/usr/bin/sing-box version

echo "Done."
