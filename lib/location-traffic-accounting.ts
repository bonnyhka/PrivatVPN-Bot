import fs from 'fs'
import path from 'path'

export type LocationTrafficHistoryEntry = {
  timestamp: string
  bytes: number
  totalBytes?: number
}

export type LocationTrafficSnapshot = {
  todayBytes: number
  lastCycleBytes: number
  updatedAt: string | null
  history: LocationTrafficHistoryEntry[]
}

export type LocationTrafficAccounting = {
  day: string
  updatedAt: string | null
  locations: Record<string, LocationTrafficSnapshot>
}

export const LOCATION_TRAFFIC_ACCOUNTING_FILE = path.resolve(
  process.cwd(),
  'data',
  'location-traffic-accounting.json'
)

export function readLocationTrafficAccounting(): LocationTrafficAccounting | null {
  try {
    const raw = fs.readFileSync(LOCATION_TRAFFIC_ACCOUNTING_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

