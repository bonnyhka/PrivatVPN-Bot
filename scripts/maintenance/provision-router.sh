#!/bin/sh

# PrivatVPN Router Provisioning Script (OpenWrt)
# Usage: ./provision-router.sh <router_ip> <sub_id> <admin_password>

ROUTER_IP=$1
SUB_ID=$2
PASSWORD=$3
API_HOST=${4:-"https://privatvpn.ru"}

if [ -z "$ROUTER_IP" ] || [ -z "$SUB_ID" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: $0 <router_ip> <sub_id> <admin_password>"
    exit 1
fi

echo "--- Starting Provisioning for Router $ROUTER_IP ---"

# 1. Install sing-box and dependencies
echo "[1/4] Installing sing-box and dependencies..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$ROUTER_IP "opkg update && opkg install sing-box kmod-tun ca-bundle"

# 2. Fetch Config from API
echo "[2/4] Fetching config for Sub ID: $SUB_ID..."
CONFIG_JSON=$(curl -s "$API_HOST/api/sub/$SUB_ID/router")

if echo "$CONFIG_JSON" | grep -q "Internal Server Error" || [ -z "$CONFIG_JSON" ]; then
    echo "Error: Failed to fetch config from API. Check Sub ID or API Connectivity."
    exit 1
fi

# 3. Upload Config to Router
echo "[3/4] Uploading config to /etc/sing-box/config.json..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$ROUTER_IP "echo '$CONFIG_JSON' > /etc/sing-box/config.json"

# 4. Configure Firewall and Service
echo "[4/4] Configuring Firewall and Enabling Service..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$ROUTER_IP << 'EOF'
# Enable sing-box service
/etc/init.d/sing-box enable

# Basic Firewall setup for TUN (if not already handled by sing-box auto_route)
# Note: sing-box auto_route=true handles most of this, but we ensure tun0 is trusted
uci set firewall.singbox=zone
uci set firewall.singbox.name='singbox'
uci set firewall.singbox.input='ACCEPT'
uci set firewall.singbox.output='ACCEPT'
uci set firewall.singbox.forward='ACCEPT'
uci set firewall.singbox.masq='1'
uci set firewall.singbox.mtu_fix='1'
uci set firewall.singbox.device='tun0'
uci commit firewall
/etc/init.d/firewall restart

# Restart sing-box
/etc/init.d/sing-box restart
EOF

echo "--- Provisioning Complete! ---"
echo "Router at $ROUTER_IP is now protected by PrivatVPN."
