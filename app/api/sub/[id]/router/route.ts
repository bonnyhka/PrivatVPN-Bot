import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getDynamicPlans, getDisplayTrafficLimit } from '@/lib/plans'
import {
  DIRECT_DOMAIN_KEYWORDS,
  DIRECT_DOMAIN_SUFFIXES,
} from '@/lib/routing-policy'
import { buildSubscriptionLookupWhere, DUMMY_UUID } from '@/lib/security'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'
import { DEFAULT_REALITY_SNI, getPlanVlessPort } from '@/lib/vpn-protocols'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_SHORT_ID = '9f10e304859bc070'
const CLIENT_HEALTHCHECK_URL = 'https://www.apple.com/library/test/success.html'

function getLocationPriority(planId: string, locationId: string) {
  const hasFinland = planId === 'fortress' || planId === 'citadel'
  if (hasFinland) {
    if (locationId === 'cmnn7t7mg0000mg2lfjgs2al3') return 0
    if (locationId === 'germany1') return 1
    if (locationId === 'netherlands1') return 2
    if (locationId === 'cmntcblz500021ichzmf6ilyp') return 3
    return 10
  }

  if (locationId === 'germany1') return 0
  if (locationId === 'netherlands1') return 1
  if (locationId === 'cmntcblz500021ichzmf6ilyp') return 2
  return 10
}

function getAllowedLocationIds(planId: string) {
  if (planId === 'scout') return new Set(['germany1'])
  if (planId === 'guardian') return new Set(['germany1', 'netherlands1', 'cmntcblz500021ichzmf6ilyp'])
  return null
}

function getEmojiFlag(code: string) {
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
}

function buildSubscriptionUserinfo(trafficUsed: bigint | number, expiresAt: Date, trafficLimit?: number | null) {
  const parts = [`upload=0`, `download=${trafficUsed.toString()}`]
  if (trafficLimit && Number.isFinite(trafficLimit) && trafficLimit > 0) {
    parts.push(`total=${trafficLimit}`)
  }
  parts.push(`expire=${Math.floor(expiresAt.getTime() / 1000)}`)
  return parts.join(';')
}

function buildSubscriptionHeaders(userinfo: string, profileTitle: string, filename: string) {
  return {
    'subscription-userinfo': userinfo,
    'profile-title': profileTitle,
    'content-disposition': `attachment; filename="${filename}"`,
    'profile-web-page-url': 'https://t.me/privatvpnru',
    'support-url': 'https://t.me/privatruvpn_bot',
    'ping-type': 'proxy',
    'check-url-via-proxy': CLIENT_HEALTHCHECK_URL,
    'mux-enable': '0',
    'server-address-resolve-enable': '1',
    'server-address-resolve-dns-domain': 'https://common.dot.dns.yandex.net/dns-query',
    'server-address-resolve-dns-ip': '77.88.8.8',
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 180, 60 * 1000, '/api/sub/router')
    if (!allowed) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': String(retryAfter ?? 60) },
      })
    }

    const { id } = await params
    const sub = await prisma.subscription.findFirst({
      where: buildSubscriptionLookupWhere(id),
      include: { user: true },
    })

    if (!sub || sub.status !== 'active' || new Date(sub.expiresAt).getTime() < Date.now()) {
      return new Response('Subscription invalid or expired', { status: 403 })
    }

    const plans = await getDynamicPlans()
    const plan = plans.find((item) => item.id === sub.planId)
    const allowedLocationIds = getAllowedLocationIds(sub.planId)
    const locations = (await prisma.location.findMany({ where: { isActive: true } }))
      .filter((location) => !allowedLocationIds || allowedLocationIds.has(location.id))
      .sort((left, right) => getLocationPriority(sub.planId, left.id) - getLocationPriority(sub.planId, right.id))

    const outbounds = locations.map((location) => {
      const userUuid = sub.vlessUuid || (location as any).vlessUuid || DUMMY_UUID
      const label = `${getEmojiFlag(location.flag)} ${location.name}`.trim()

      return {
        type: 'vless',
        tag: label,
        server: location.host,
        server_port: getPlanVlessPort(sub.planId),
        uuid: userUuid,
        multiplex: { enabled: false },
        tls: {
          enabled: true,
          server_name: (location as any).vlessRealitySni || DEFAULT_REALITY_SNI,
          alpn: ['h2', 'http/1.1'],
          utls: { enabled: true, fingerprint: 'chrome' },
          reality: {
            enabled: true,
            public_key: (location as any).vlessRealityPublicKey,
            short_id: (location as any).vlessRealityShortId || DEFAULT_SHORT_ID,
          },
        },
      }
    })

    if (outbounds.length === 0) {
      return new Response('No active locations available for this subscription', { status: 503 })
    }

    const bestOutbound = outbounds[0].tag
    const userinfo = buildSubscriptionUserinfo(
      sub.trafficUsed,
      new Date(sub.expiresAt),
      getDisplayTrafficLimit(plan),
    )
    const planName = plan?.name || sub.planId.toUpperCase()
    const profileTitle = `PrivatVPN [${planName}]`

    const routerConfig = {
      log: {
        level: 'info',
        timestamp: true,
      },
      dns: {
        servers: [
          { tag: 'proxy-dns', address: 'https://dns.adguard-dns.com/dns-query', address_resolver: 'local-dns', detour: 'direct' },
          { tag: 'local-dns', address: 'local' },
          { tag: 'block-dns', address: 'rcode://name_error' },
        ],
        rules: [{ domain_suffix: DIRECT_DOMAIN_SUFFIXES, domain_keyword: DIRECT_DOMAIN_KEYWORDS, server: 'local-dns' }],
        final: 'proxy-dns',
        strategy: 'ipv4_only',
      },
      inbounds: [
        {
          type: 'tun',
          tag: 'tun-in',
          interface_name: 'PrivatVPN',
          address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
          mtu: 1380,
          auto_route: true,
          strict_route: true,
          stack: 'system',
        },
      ],
      outbounds: [
        {
          type: 'selector',
          tag: 'proxy',
          default: bestOutbound,
          outbounds: outbounds.map((outbound) => outbound.tag),
        },
        ...outbounds,
        { type: 'direct', tag: 'direct' },
        { type: 'block', tag: 'block' },
        { type: 'dns', tag: 'dns-out' },
      ],
      route: {
        auto_detect_interface: true,
        default_domain_resolver: {
          server: 'proxy-dns',
          strategy: 'ipv4_only',
        },
        domain_strategy: 'ipv4_only',
        rules: [
          { action: 'sniff' },
          { protocol: 'dns', action: 'hijack-dns' },
          { ip_is_private: true, action: 'route', outbound: 'direct' },
          { domain_suffix: DIRECT_DOMAIN_SUFFIXES, domain_keyword: DIRECT_DOMAIN_KEYWORDS, action: 'route', outbound: 'direct' },
        ],
        final: 'proxy',
      },
    }

    return NextResponse.json(routerConfig, {
      headers: buildSubscriptionHeaders(userinfo, profileTitle, `${profileTitle}.router.json`),
    })
  } catch (error) {
    console.error('Subscription Router API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
