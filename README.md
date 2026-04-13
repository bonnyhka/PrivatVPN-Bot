# PrivatVPN Infrastructure & Bot

A robust, enterprise-grade VPN platform built with Next.js, Prisma, and the Telegram platform. It integrates advanced anti-DPI methods and proxy protocols to ensure connectivity under restrictive network conditions.

## 🏗 System Architecture

The core system consists of multiple micro-processes managed by PM2, utilizing a unified Prisma PostgreSQL database:
1. **Web App (Next.js)**: Admin dashboard, dynamic subscription API generation (`/api/sub/[id]`), and billing interfaces.
2. **Telegram Bot**: User onboarding, node selection, support wizards, and automated lifecycle notifications.
3. **Cron Scripts**: Traffic resetting, statistical syncing, node expiration tracking, and health monitoring.

## 🛡️ Anti-DPI & Network Optimizations

We employ advanced, multi-layered strategies to bypass Deep Packet Inspection (DPI) and improve latency:

- **Protocols Supported**:
  - `VLESS + REALITY` (Primary): Configured with `www.apple.com` SNI. `xtls-rprx-vision` flow is enabled globally to prevent active probing, but specifically **disabled for Netherlands** due to provider compatibility issues.
  - `Shadowsocks (aes-256-gcm)` (Secondary): Reliable fallback.
  - `Hysteria2` (Speed): QUIC-based protocol targeting congested/throttled networks.

- **Auto-Failover**:
  - The subscription API injects a `urltest` outbound group ("⚡ Авто") as the primary route in sing-box clients, pinging all available protocols every 3 minutes.

- **Gaming & Whitelist Bypass (Split-tunneling)**:
  - Direct routing injected for core Russian networks (GosUslugi, Yandex, Banks) to alleviate VPN load.
  - Gaming platforms (Steam, Valve IPs `162.254.0.0/16`, Epic Games) bypass the VPN entirely to ensure 0 added latency.
  - Cloudflare Resolver (`1.1.1.1`) is uniquely routed directly for non-blocked queries.

## 🔄 Automated Protocol Monitoring

**Health Checks (`scripts/check-servers.ts`)**:
To accurately determine if firewalls are blocking handshakes (and not just TCP ports), the custom health monitor executes a full headless `sing-box` connection via a SOCKS5 proxy pipe. It independently verifies VLESS, Shadowsocks, and Hysteria2 every 10 minutes.

**Incident Response**:
- **Admin Alert**: Immediate Telegram notification generated upon complete server failure.
- **User Broadcast**: If a server experiences 2 consecutive hard failures, the bot broadcasts an automatic failover instruction ("Зафиксированы сбои...") to affected active users. These messages **auto-delete after 5 minutes** to prevent chat clutter.

## 🚀 Deployment Operations

Use PM2 for zero-downtime restarts and management:
```bash
# Build the UI and API
npm run build

# Restart standard services
pm2 restart web-app check-servers
```
