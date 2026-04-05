import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'
import { isDiagnosticsSshAuthError, readLocationDiagnosticsCache } from '@/lib/location-diagnostics'

function getHealth(load: number, diagnostics: any) {
  if (!diagnostics) {
    return { healthStatus: 'attention', healthLabel: 'Нет диагностики', healthScore: 55, healthReasons: ['Нет свежих сетевых замеров'] }
  }

  if (diagnostics.isActive === false) {
    return { healthStatus: 'offline', healthLabel: 'Офлайн', healthScore: 5, healthReasons: ['Узел недоступен по диагностике'] }
  }

  if (diagnostics.rawStatus === 'error') {
    const errMsg = String(diagnostics.error || '')
    if (isDiagnosticsSshAuthError(errMsg)) {
      // If SSH auth failed, other network checks (mtr/iperf/ports) may still be valid.
      // Don't mark node offline just because SSH to the node failed.
    }
    if (!isDiagnosticsSshAuthError(errMsg)) {
      return { healthStatus: 'offline', healthLabel: 'Офлайн', healthScore: 5, healthReasons: ['Узел недоступен по диагностике'] }
    }
  }

  const loss = Number(diagnostics.pingTarget?.lossPct ?? diagnostics.mtr?.lossPct ?? 0)
  const ping = Number(diagnostics.pingTarget?.avgMs ?? diagnostics.mtr?.avgMs ?? 0)
  const sender = Number(diagnostics.iperf?.senderMbps || 0)
  const reasons: string[] = []

  let score = 100
  if (loss >= 1) { score -= 25; reasons.push(`Потери ${loss.toFixed(1)}%`) }
  if (ping >= 150) { score -= 20; reasons.push(`Высокий ping ${Math.round(ping)} мс`) }
  if (sender > 0 && sender < 800) { score -= 20; reasons.push(`Низкий iperf ${Math.round(sender)} Мбит/с`) }
  if (load >= 85) { score -= 20; reasons.push(`Высокая нагрузка ${Math.round(load)}%`) }
  if (load >= 70) { score -= 10; reasons.push(`Нагрузка ${Math.round(load)}%`) }

  score = Math.max(0, Math.min(100, score))

  if (score >= 85) return { healthStatus: 'stable', healthLabel: 'Стабильна', healthScore: score, healthReasons: reasons }
  if (score >= 65) return { healthStatus: 'attention', healthLabel: 'Внимание', healthScore: score, healthReasons: reasons }
  if (score >= 40) return { healthStatus: 'degraded', healthLabel: 'Деградация', healthScore: score, healthReasons: reasons }
  return { healthStatus: 'critical', healthLabel: 'Критично', healthScore: score, healthReasons: reasons }
}

function getFreshnessLabel(checkedAt?: string) {
  if (!checkedAt) return 'нет данных'
  const ts = new Date(checkedAt).getTime()
  if (!Number.isFinite(ts)) return 'нет данных'
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000))
  if (mins < 2) return 'только что'
  if (mins < 60) return `${mins} мин назад`
  return `${Math.round(mins / 60)} ч назад`
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 120, 60 * 1000, '/api/locations')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }

    const [locations, diagnosticsCache] = await Promise.all([
      prisma.location.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          country: true,
          flag: true,
          host: true,
          ping: true,
          load: true,
          liveConnections: true,
          isActive: true,
        },
        orderBy: [{ country: 'asc' }, { name: 'asc' }],
      }),
      Promise.resolve(readLocationDiagnosticsCache()),
    ])

    const diagnosticsByLocation = diagnosticsCache?.locations || {}

    const payload = locations.map((loc) => {
      const diagnostics = diagnosticsByLocation[loc.id]
      const health = getHealth(loc.load, diagnostics)
      const onlinePorts = Number(diagnostics?.onlinePorts || 0)
      const totalPorts = Number(diagnostics?.totalPorts || 0)
      const capacityLabel = totalPorts > 0 ? `${onlinePorts}/${totalPorts} входов online` : 'входы: нет данных'
      const checkedAt = diagnostics?.checkedAt || null

      let activePing = loc.ping || 0
      if (diagnostics?.pingTarget?.avgMs) {
        activePing = Math.round(diagnostics.pingTarget.avgMs)
      } else if (diagnostics?.mtr?.avgMs) {
        activePing = Math.round(diagnostics.mtr.avgMs)
      }

      return {
        ...loc,
        ping: activePing,
        checks: diagnostics?.checks || [],
        diagnostics: diagnostics || null,
        checkedAt,
        freshnessLabel: getFreshnessLabel(checkedAt || undefined),
        capacityLabel,
        ...health,
      }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Locations API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

