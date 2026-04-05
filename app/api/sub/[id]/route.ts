import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getDynamicPlans } from '@/lib/plans'
import crypto from 'crypto'
import { buildSubscriptionLookupWhere, DUMMY_UUID } from '@/lib/security'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Use loc.name directly


function getPlanVlessPort(planId: string) {
  if (planId === 'fortress') return 10443
  if (planId === 'guardian') return 11443
  if (planId === 'scout') return 9443
  return 12443
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
      where: buildSubscriptionLookupWhere(id),
      include: { user: true }
    })

    if (!sub || sub.status !== 'active' || new Date(sub.expiresAt).getTime() < Date.now()) {
      return new Response('Subscription invalid or expired', { status: 403 })
    }

    const plans = await getDynamicPlans()
    const plan = plans.find(p => p.id === sub.planId)
    const locations = await prisma.location.findMany({ where: { isActive: true } })

    const getLocationPriority = (locationId: string) => (locationId === 'germany1' ? 0 : (locationId === 'netherlands1' ? 1 : 10))
    let sortedLocations = locations.sort((a, b) => getLocationPriority(a.id) - getLocationPriority(b.id))

    if (sub.planId === 'scout') sortedLocations = sortedLocations.filter(l => l.id === 'germany1')
    else if (sub.planId === 'guardian') sortedLocations = sortedLocations.filter(l => l.id === 'germany1' || l.id === 'netherlands1')

    const userAgent = (req.headers.get('user-agent') || '').toLowerCase()
    const isAdvancedClient = userAgent.includes('sing-box') || userAgent.includes('hiddify') || req.headers.get('x-privatvpn-client') === 'desktop'
    
    const configs: string[] = []
    const getEmojiFlag = (code: string) => code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))

    for (const loc of sortedLocations) {
      const userUuid = sub.vlessUuid || (loc as any).vlessUuid || DUMMY_UUID
      const ruName = loc.name
      const flag = getEmojiFlag(loc.flag)
      const vlessSni = (loc as any).vlessRealitySni || 'www.microsoft.com'
      
      const vPort = getPlanVlessPort(sub.planId)
      configs.push(`vless://${userUuid}@${loc.host}:${vPort}?encryption=none&security=reality&sni=${vlessSni}&fp=chrome&alpn=h2&pbk=${(loc as any).vlessRealityPublicKey}&sid=${(loc as any).vlessRealityShortId || '9f10e304859bc070'}&type=tcp&flow=xtls-rprx-vision#${encodeURIComponent(flag + ' ' + ruName)}`)

      const ssPass = crypto.createHash('md5').update(`${loc.id}privat`).digest('hex')
      configs.push(`ss://${Buffer.from(`chacha20-ietf-poly1305:${ssPass}`).toString('base64').replace(/=/g, '')}@${loc.host}:15113#${encodeURIComponent(flag + ' ' + ruName + ' ⚡')}`)

      configs.push(`hysteria2://${userUuid}@${loc.host}:443/?sni=${vlessSni}&insecure=1&alpn=h3%2Ch2%2Chttp%2F1.1#${encodeURIComponent(flag + ' ' + ruName + ' 📱')}`)
    }

    const trafficLimitBytes = (plan?.trafficLimit && plan.trafficLimit !== Number.MAX_SAFE_INTEGER) ? plan.trafficLimit : 0;
    const userinfo = `upload=0;download=${sub.trafficUsed.toString()};total=${trafficLimitBytes};expire=${Math.floor(new Date(sub.expiresAt).getTime() / 1000)}`;
    
    // Improved profile title: PrivatVPN [PlanName]
    const planName = plan?.name || sub.planId.toUpperCase()
    const profileTitle = `PrivatVPN [${planName}]`

    if (isAdvancedClient) {
      const outbounds = []
      for (const l of sortedLocations) {
        const userUuid = sub.vlessUuid || (l as any).vlessUuid || DUMMY_UUID
        const ruName = l.name
        const flag = getEmojiFlag(l.flag)
        
        outbounds.push({
          type: 'vless',
          tag: `${flag} ${ruName}`,
          server: l.host,
          server_port: getPlanVlessPort(sub.planId),
          uuid: userUuid,
          flow: 'xtls-rprx-vision',
          tls: {
            enabled: true,
            server_name: (l as any).vlessRealitySni || 'www.microsoft.com',
            utls: { enabled: true, fingerprint: 'chrome' },
            reality: { enabled: true, public_key: (l as any).vlessRealityPublicKey, short_id: (l as any).vlessRealityShortId || '9f10e304859bc070' }
          }
        })

        const ssPass = crypto.createHash('md5').update(`${l.id}privat`).digest('hex')
        outbounds.push({
          type: 'shadowsocks',
          tag: `${flag} ${ruName} ⚡`,
          server: l.host,
          server_port: 15113,
          method: 'chacha20-ietf-poly1305',
          password: ssPass
        })

        outbounds.push({
          type: 'hysteria2',
          tag: `${flag} ${ruName} 📱`,
          server: l.host,
          server_port: 443,
          password: userUuid,
          tls: { enabled: true, server_name: (l as any).vlessRealitySni || 'www.microsoft.com', insecure: true }
        } as any)
      }

      const bestOutbound = outbounds[0]?.tag || 'direct'
      const singboxConfig = {
        dns: {
          servers: [
            { tag: 'proxy-dns', address: 'https://dns.adguard-dns.com/dns-query', detour: 'direct' },
            { tag: 'local-dns', address: 'local', detour: 'direct' }
          ],
          rules: [
            { protocol: 'dns', server: 'local-dns' },
            { domain_suffix: ['ru', 'sberbank.ru', 'tinkoff.ru', 'gosuslugi.ru'], server: 'local-dns' }
          ],
          final: 'local-dns'
        },
        outbounds: [
          ...outbounds,
          { type: 'direct', tag: 'direct' },
          { type: 'block', tag: 'block' },
          { type: 'dns', tag: 'dns-out' }
        ],
        route: {
          rules: [
            { protocol: 'dns', outbound: 'dns-out' },
            { domain_suffix: ['sberbank.ru', 'tinkoff.ru', 'vtb.ru', 'gosuslugi.ru', 'yandex.ru', 'vk.com'], outbound: 'direct' }
          ],
          final: bestOutbound,
          auto_detect_interface: true
        }
      }
      return NextResponse.json(singboxConfig, { 
        headers: { 
          'subscription-userinfo': userinfo,
          'profile-title': profileTitle,
          'content-disposition': `attachment; filename="${profileTitle}.json"`,
          'profile-web-page-url': 'https://t.me/privatvpnru',
          'support-url': 'https://t.me/privatruvpn_bot'
        } 
      })
    }

    return new NextResponse(Buffer.from(configs.join('\n') + '\n').toString('base64'), {
      headers: { 
        'content-type': 'text/plain; charset=utf-8', 
        'subscription-userinfo': userinfo,
        'profile-title': profileTitle,
        'content-disposition': `attachment; filename="${profileTitle}.txt"`,
        'profile-web-page-url': 'https://t.me/privatvpnru',
        'support-url': 'https://t.me/privatruvpn_bot'
      }
    })
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 })
  }
}
