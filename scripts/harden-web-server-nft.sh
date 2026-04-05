#!/bin/bash
set -e

# Flush rules
nft flush ruleset

# Define ruleset
cat <<EOF | nft -f -
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow established and related connections
        ct state established,related accept

        # Allow loopback interface
        iif lo accept

        # Allow ICMP (Ping)
        ip protocol icmp accept
        ip6 nexthdr icmpv6 accept

        # Allow SSH (Port 22)
        tcp dport 22 accept

        # Allow HTTP (Port 80)
        tcp dport 80 accept

        # Allow HTTPS (Port 443)
        tcp dport 443 accept
    }
}
EOF

echo "NFT_FIREWALL_HARDENED_SUCCESS"
