import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

const settingsPath = path.join(process.cwd(), 'data', 'app-settings.json')

export async function GET() {
  try {
    await requireAdmin()
    let settings = {}
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json()
    let settings = {}
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      } catch (e) {}
    }
    settings = { ...settings, ...body }
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
