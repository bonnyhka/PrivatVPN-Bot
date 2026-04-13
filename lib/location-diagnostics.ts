import fs from 'fs'
import path from 'path'

export interface LocationDiagnosticsSnapshot {
  checkedAt?: string
  targetHost?: string
  targetLabel?: string
  pingTargetHost?: string
  pingTargetLabel?: string
  bandwidthTargetHost?: string
  bandwidthTargetLabel?: string
  system?: {
    uptimeSec?: number | null
    bootedAt?: string | null
  }
  networkHistory?: Array<{
    timestamp: string
    pingTargetAvgMs?: number | null
    packetLossPct?: number | null
    iperfSenderMbps?: number | null
    iperfReceiverMbps?: number | null
    retransmits?: number | null
    mtrAvgMs?: number | null
    mtrWorstMs?: number | null
    mtrLossPct?: number | null
  }>
  vpnTraffic?: {
    egressBytes?: number | null
    ingressBytes?: number | null
    totalCounterBytes?: number | null
    deltaBytes?: number | null
    todayBytes?: number | null
    excludedProbeBytes?: number | null
    excludedProbeBytesToday?: number | null
    normalizationVersion?: number | null
    day?: string | null
    history?: Array<{
      timestamp: string
      bytes: number
      totalBytes?: number
    }>
  }
  checks?: Array<{
    key: string
    port: number
    label: string
    isUp: boolean
    latency: number
  }>
  onlinePorts?: number
  totalPorts?: number
  isActive?: boolean
  pingTarget?: {
    lossPct: number | null
    avgMs: number | null
    maxMs: number | null
  }
  iperf?: {
    senderMbps: number | null
    receiverMbps: number | null
    retransmits: number | null
  }
  mtr?: {
    lossPct: number | null
    avgMs: number | null
    worstMs: number | null
    host?: string | null
  }
  rawStatus?: 'ok' | 'error'
  error?: string | null
}

interface DiagnosticsCacheFile {
  updatedAt?: string
  locations?: Record<string, LocationDiagnosticsSnapshot>
}

const diagnosticsFile = path.resolve(process.cwd(), 'data/location-diagnostics.json')

export function readLocationDiagnosticsCache(): DiagnosticsCacheFile {
  try {
    const raw = fs.readFileSync(diagnosticsFile, 'utf8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

export function getDiagnosticsFilePath() {
  return diagnosticsFile
}

/** SSH/login failure on the diagnostics host — VPN on the node may still work. */
export function isDiagnosticsSshAuthError(error?: string | null): boolean {
  const e = String(error || '').toLowerCase()
  if (!e) return false
  return (
    e.includes('authentication') ||
    e.includes('all configured authentication methods failed') ||
    e.includes('permission denied') ||
    e.includes('auth fail')
  )
}
