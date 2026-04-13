import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import prisma from '@/lib/db'
import { formatDurationMs } from '@/lib/uptime'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

type Pm2Process = {
  name?: string
  monit?: {
    cpu?: number
  }
  pm2_env?: {
    status?: string
    pm_uptime?: number
  }
}

async function getPm2Processes(): Promise<Pm2Process[]> {
  try {
    const { stdout } = await execAsync('pm2 jlist')
    const list = JSON.parse(stdout)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function findProcess(processes: Pm2Process[], name: string) {
  return processes.find((proc) => proc.name === name) || null
}

function isOnline(proc: Pm2Process | null) {
  return proc?.pm2_env?.status === 'online'
}

function getUptimeLabel(proc: Pm2Process | null) {
  const startedAt = Number(proc?.pm2_env?.pm_uptime || 0)
  if (!Number.isFinite(startedAt) || startedAt <= 0) return 'нет данных'
  return formatDurationMs(Date.now() - startedAt)
}

function getCpuLoad(proc: Pm2Process | null) {
  const cpu = Number(proc?.monit?.cpu || 0)
  if (!Number.isFinite(cpu) || cpu < 0) return 0
  return Math.round(cpu)
}

export async function GET() {
  const stats: any = {
    bot: { status: 'offline', latency: 0, load: 0, name: 'Telegram Bot', uptime: 'нет данных' },
    api: { status: 'offline', latency: 0, load: 0, name: 'Management API', uptime: 'нет данных' },
    database: { status: 'offline' },
  }

  try {
    const startTime = Date.now()
    const [processes, dbOnline] = await Promise.all([
      getPm2Processes(),
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    ])

    const botProc = findProcess(processes, 'bot')
    if (isOnline(botProc)) {
      stats.bot.status = 'online'
      stats.bot.load = getCpuLoad(botProc)
      stats.bot.uptime = getUptimeLabel(botProc)
    }

    if (dbOnline) {
      stats.database.status = 'online'
    }

    const apiProc = findProcess(processes, 'web-app')
    if (dbOnline && isOnline(apiProc)) {
      stats.api.status = 'online'
      stats.api.latency = Date.now() - startTime
      stats.api.load = getCpuLoad(apiProc)
      stats.api.uptime = getUptimeLabel(apiProc)
    }

    return NextResponse.json(stats)
  } catch {
    return NextResponse.json(stats)
  }
}
