import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import prisma from '@/lib/db'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const { routerIp, targetTelegramId, routerPassword } = await req.json()

    if (!routerIp || !targetTelegramId || !routerPassword) {
      return new Response('Missing parameters', { status: 400 })
    }

    // Sanitize routerIp to prevent shell injection (only allow valid IP chars)
    if (!/^[\d.]+$/.test(routerIp)) {
      return NextResponse.json({ success: false, error: 'Invalid IP address format' }, { status: 400 })
    }

    // 2. Find target user
    const targetUser = await prisma.user.findUnique({
      where: { telegramId: String(targetTelegramId) }
    })

    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден. Попросите клиента отправить /start боту (открыв мини-апп один раз) перед настройкой роутера.'
      }, { status: 404 })
    }

    // 3. Upsert lifetime subscription for the user (plan 'citadel' -> fastest speed, ~1Gbps)
    // 36500 days ~ 100 years
    const expiresAt = new Date(Date.now() + 36500 * 24 * 60 * 60 * 1000)
    
    const subscription = await prisma.subscription.upsert({
      where: { userId: targetUser.id },
      update: {
        planId: 'citadel',
        expiresAt,
        status: 'active',
        autoRenew: false,
        isManual: true
      },
      create: {
        userId: targetUser.id,
        planId: 'citadel',
        status: 'active',
        subscriptionUrl: `https://vless.privatvpn.ru/sub/${targetUser.id}`, // Mock base URL, script generates config anyway
        vlessUuid: crypto.randomUUID(),
        autoRenew: false,
        expiresAt,
        isManual: true
      }
    })

    const scriptPath = path.resolve(process.cwd(), 'scripts/provision-router.sh')
    
    // Execute script
    // Note: We use a promise to handle the execution
    const executeScript = () => {
      return new Promise((resolve, reject) => {
        // Execute with timeout and safety
        const cmd = `bash ${scriptPath} ${routerIp} ${subscription.id} ${routerPassword}`
        console.log(`Executing: bash ${scriptPath} ${routerIp} ${subscription.id} ******`)
        
        exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Provisioning failed: ${error.message}`)
            return reject({ message: error.message, stderr })
          }
          resolve({ stdout, stderr })
        })
      })
    }

    const { stdout, stderr } = await executeScript() as any

    return NextResponse.json({ 
      success: true, 
      output: stdout,
      errors: stderr 
    })

  } catch (error: any) {
    console.error('Provisioning error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal Server Error',
      details: error.stderr || ''
    }, { status: 500 })
  }
}
