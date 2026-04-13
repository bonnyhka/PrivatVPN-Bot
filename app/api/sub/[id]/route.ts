import { NextResponse } from 'next/server'
import prisma from '../../../../lib/db'
import { 
  getPlanVlessPort, 
  isPlanAllowedInLocation,
} from '../../../../lib/vpn-protocols'
import { getDynamicPlans, getDisplayTrafficLimit } from '../../../../lib/plans'
import { rateLimit } from '../../../../lib/rate-limit'

// Constants for sub-generation
const DUMMY_UUID = '44444444-4444-4444-8444-444444444444'
const DEFAULT_REALITY_SNI = 'www.apple.com'
const CLIENT_HEALTHCHECK_URL = 'https://www.apple.com/library/test/success.html'
const RU_NODE_IP = '185.72.147.29'

const PROXY_RESOURCES = {
  geosite: ['telegram', 'instagram', 'meta', 'twitter', 'openai', 'anthropic', 'netflix', 'tiktok'],
  geoip: ['telegram', 'openai', 'netflix', 'tiktok']
}

const DIRECT_RESOURCES = {
  geosite: ['youtube', 'discord']
}

const DIRECT_DOMAIN_SUFFIXES = [
  'ru', 'su', 'kz', 'by', 'gov.ru', 'mil.ru', 'nalog.ru', 'gosuslugi.ru',
  'vk.com', 'ok.ru', 'yandex.ru', 'mail.ru', 'rambler.ru', 'avito.ru',
  'ozon.ru', 'wildberries.ru', 'sberbank.ru', 'tinkoff.ru', 'vtb.ru',
  'kaspersky.ru', 'drweb.ru', '1c.ru', 'bitrix24.ru', 'ya.ru'
]

const DIRECT_DOMAIN_KEYWORDS = [
  'sber', 'tinkoff', 'vtb', 'alfa', 'gosuslugi', 'nalog', 'dnevnik',
  'mos.ru', 'spb.ru', 'yandex', 'mail.ru', 'vkontakte', 'odnoklassniki'
]

const DIRECT_IP_CIDR = [
  '95.173.128.0/18', '178.248.232.0/21', '185.72.144.0/22', // RU nets
  '127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '100.64.0.0/10' // local
]

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}

function getLocationPriority(planId: string, locationId: string): number {
  if (locationId === 'germany1') return 1
  if (locationId === 'netherlands1') return 2
  if (locationId === 'cmntcblz500021ichzmf6ilyp') return 10
  return 100
}

function buildSubscriptionUserinfo(used: bigint, expiry: Date, total: string | null | undefined) {
  const safeTotal = total || 'unlimited'
  const totalBytes = safeTotal.includes('unlimited') ? 0 : parseInt(safeTotal) * 1024 * 1024 * 1024
  return `upload=0; download=${used}; total=${totalBytes}; expire=${Math.floor(expiry.getTime() / 1000)}`
}

function buildSubscriptionHeaders(userinfo: string, profileTitle: string, filename: string) {
  return {
    'subscription-userinfo': userinfo,
    'profile-title': profileTitle,
    'content-disposition': `attachment; filename="${filename}"`,
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'pragma': 'no-cache',
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
    const { allowed, retryAfter } = rateLimit(ip, 180, 60 * 1000, '/api/sub')
    if (!allowed) {
      return new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } })
    }

    const { id } = await params
    const sub = await prisma.subscription.findFirst({
      where: {
        OR: [
          { id: id },
          { subscriptionUrl: { endsWith: id } }
        ]
      },
      include: { user: true }
    })

    if (!sub || sub.status !== 'active' || new Date(sub.expiresAt).getTime() < Date.now()) {
      return new Response('Subscription invalid or expired', { status: 403 })
    }

    const plans = await getDynamicPlans()
    const plan = plans.find(p => p.id === sub.planId)
    const trafficLimit = (plan as any)?.trafficLimit ?? Number.MAX_SAFE_INTEGER
    
    if (BigInt(sub.trafficUsed) >= BigInt(trafficLimit)) {
      return new Response('Traffic limit exceeded', { status: 403 })
    }

    const locations = await prisma.location.findMany({ where: { isActive: true } })

    let sortedLocations = []
    try {
      let filteredLocations = locations.filter(l => isPlanAllowedInLocation(sub.planId, l.country))
      sortedLocations = filteredLocations.sort((a, b) => getLocationPriority(sub.planId, a.id) - getLocationPriority(sub.planId, b.id))
    } catch (e) {
      console.error('Location sorting error:', e)
      sortedLocations = locations // Fallback to all locations unsorted
    }

    const userAgent = (req.headers.get('user-agent') || '').toLowerCase()
    const isAdvancedClient = userAgent.includes('sing-box') || userAgent.includes('hiddify') || req.headers.get('x-privatvpn-client') === 'desktop'
    
    const configs: string[] = []
    const getEmojiFlag = (code: string) => code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))

    for (const loc of sortedLocations) {
      const userUuid = sub.vlessUuid || DUMMY_UUID
      const ruName = loc.name
      const flag = getEmojiFlag(loc.flag)
      const vlessSni = (loc as any).vlessRealitySni || DEFAULT_REALITY_SNI
      const hostOnly = loc.host.split(':')[0]
      
      let vPort = loc.vlessPort || getPlanVlessPort(sub.planId)
      configs.push(`vless://${userUuid}@${hostOnly}:${vPort}?encryption=none&security=reality&sni=${vlessSni}&fp=chrome&alpn=h2%2Chttp%2F1.1&pbk=${(loc as any).vlessRealityPublicKey}&sid=${(loc as any).vlessRealityShortId || '2780393bb22527c3'}&type=tcp#${encodeURIComponent(flag + ' ' + ruName)}`)
    }

    const userinfo = buildSubscriptionUserinfo(sub.trafficUsed, new Date(sub.expiresAt), String(getDisplayTrafficLimit(plan) ?? 'unlimited'))
    const planName = plan?.name || sub.planId.toUpperCase()
    const profileTitle = `PrivatVPN [${planName}]`

    if (isAdvancedClient) {
      const outbounds = []
      for (const l of sortedLocations) {
        const userUuid = sub.vlessUuid || DUMMY_UUID
        const ruName = l.name
        const flag = getEmojiFlag(l.flag)
        const hostOnly = l.host.split(':')[0]
        
        let vPort = l.vlessPort || getPlanVlessPort(sub.planId)
        outbounds.push({
          type: 'vless',
          tag: `${flag} ${ruName}`,
          server: hostOnly,
          server_port: vPort,
          uuid: userUuid,
          multiplex: { enabled: false },
          tls: {
            enabled: true,
            server_name: (l as any).vlessRealitySni || DEFAULT_REALITY_SNI,
            alpn: ['h2', 'http/1.1'],
            utls: { enabled: true, fingerprint: 'chrome' },
            reality: { enabled: true, public_key: (l as any).vlessRealityPublicKey, short_id: (l as any).vlessRealityShortId || '2780393bb22527c3' }
          }
        })
      }

      const allTags = outbounds.map(o => o.tag)
      const urltestTag = '?????? ????????-??????????'
      const singboxConfig = {
        dns: {
          servers: [
            { tag: 'proxy-dns', address: 'https://dns.adguard-dns.com/dns-query', address_resolver: 'local-dns', detour: urltestTag },
            { tag: 'local-dns', address: 'https://8.8.8.8/dns-query', address_resolver: 'bootstrap-dns', detour: 'direct' },
            { tag: 'bootstrap-dns', address: '8.8.8.8', detour: 'direct' },
            { tag: 'block-dns', address: 'rcode://name_error' }
          ],
          rules: [
            { domain_suffix: DIRECT_DOMAIN_SUFFIXES, domain_keyword: DIRECT_DOMAIN_KEYWORDS, server: 'local-dns' },
            { geosite: ['category-ads-all'], server: 'block-dns' }
          ],
          final: 'proxy-dns',
          strategy: 'ipv4_only'
        },
        rule_set: [
          {
            tag: 'antizapret',
            type: 'remote',
            format: 'binary',
            url: 'https://krasovs.ky/sing-box/antizapret.srs',
            download_detour: urltestTag
          }
        ],
        outbounds: [
          { type: 'urltest', tag: urltestTag, outbounds: allTags, url: CLIENT_HEALTHCHECK_URL, interval: '3m', tolerance: 50, idle_timeout: '30m' },
          ...outbounds,
          { type: 'direct', tag: 'direct' },
          { type: 'block', tag: 'block' },
          { type: 'dns', tag: 'dns-out' }
        ],
        route: {
          rules: [
            { protocol: 'dns', outbound: 'dns-out' },
            { geosite: ['category-ads-all'], outbound: 'block' },
            { geosite: DIRECT_RESOURCES.geosite, outbound: 'direct' },
            { geosite: PROXY_RESOURCES.geosite, outbound: urltestTag },
            { geoip: PROXY_RESOURCES.geoip, outbound: urltestTag },
            { domain_suffix: DIRECT_DOMAIN_SUFFIXES, domain_keyword: DIRECT_DOMAIN_KEYWORDS, outbound: 'direct' },
            { ip_cidr: DIRECT_IP_CIDR, outbound: 'direct' },
            { rule_set: 'antizapret', outbound: urltestTag }
          ],
          final: 'direct',
          default_domain_resolver: { server: 'proxy-dns', strategy: 'ipv4_only' },
          domain_strategy: 'ipv4_only',
          auto_detect_interface: true
        }
      }
      return NextResponse.json(singboxConfig, {
        headers: buildSubscriptionHeaders(userinfo, profileTitle, `${profileTitle}.json`)
      })
    }

    const happMeta = [
      '#ping-type: proxy',
      `#check-url-via-proxy: ${CLIENT_HEALTHCHECK_URL}`,
      '#mux-enable: 0',
      '#profile-update-interval: 1',
      '#server-address-resolve-enable: 1',
      '#server-address-resolve-dns-domain: https://common.dot.dns.yandex.net/dns-query',
      '#server-address-resolve-dns-ip: 77.88.8.8',
      '',
    ]
    return new NextResponse(Buffer.from(happMeta.concat(configs).join('\n') + '\n').toString('base64'), {
      headers: { 'content-type': 'text/plain; charset=utf-8', ...buildSubscriptionHeaders(userinfo, profileTitle, `${profileTitle}.txt`) }
    })
  } catch (error) {
    console.error('Subscription API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
