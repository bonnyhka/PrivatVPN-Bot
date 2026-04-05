#!/bin/bash
set -e

# Reset
iptables -F
iptables -X
iptables -t nat -F || true
iptables -t mangle -F || true

# Policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow Loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow Established
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow ICMP
iptables -A INPUT -p icmp -j ACCEPT

# Allow SSH (CRITICAL)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow Web
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules if possible? (Ubuntu/Debian)
if command -v iptables-save >/dev/null; then
  mkdir -p /etc/iptables
  iptables-save > /etc/iptables/rules.v4
fi

echo "FIREWALL_HARDENED_SUCCESS"
