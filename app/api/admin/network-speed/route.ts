import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    await requireAdmin()

    const dataPath = path.resolve(process.cwd(), 'data', 'realtime-speed.json')
    
    let speedData = { totalRxMBps: 0, totalTxMBps: 0, timestamp: 0, locations: {} }
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8')
      speedData = JSON.parse(content)
      
      // If data is older than 20 seconds, it's stale (PM2 process probably died)
      if (Date.now() - speedData.timestamp > 20000) {
        speedData.totalRxMBps = 0
        speedData.totalTxMBps = 0
        speedData.locations = {}
      }
    }

    return NextResponse.json(speedData)
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
