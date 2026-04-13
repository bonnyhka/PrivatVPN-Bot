#!/bin/bash
# Install grpcurl if missing
if [ ! -f /usr/local/bin/grpcurl ]; then
  wget -qO /tmp/g.tar.gz https://github.com/fullstorydev/grpcurl/releases/download/v1.9.1/grpcurl_1.9.1_linux_x86_64.tar.gz
  tar -xzf /tmp/g.tar.gz -C /tmp
  mv /tmp/grpcurl /usr/local/bin/grpcurl
  chmod +x /usr/local/bin/grpcurl
fi

echo "=== sing-box status ==="
systemctl is-active sing-box

echo "=== Port 10086 check ==="
ss -tlnp | grep 10086 || echo "10086 not listening"

echo "=== Describing v2ray stats service ==="
grpcurl -plaintext 127.0.0.1:10086 describe v2ray.core.app.stats.command.StatsService 2>&1 || true

echo "=== Listing all services ==="
grpcurl -plaintext 127.0.0.1:10086 list 2>&1 || true

echo "=== Query stats ==="
grpcurl -plaintext -d '{"pattern":"","reset":false}' 127.0.0.1:10086 v2ray.core.app.stats.command.StatsService.QueryStats 2>&1 || true

echo "=== Checking clash API ==="
curl -s http://127.0.0.1:9090/proxies 2>&1 | head -n 5 || echo "Clash API not responding"
