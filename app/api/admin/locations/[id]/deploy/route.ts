import { NextResponse } from 'next/server'
import { spawn } from 'child_process'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()
    
    const { id } = await params

    const customStream = new ReadableStream({
      start(controller) {
        // Run the sync script targeting only this location
        // We pass TARGET_NODE_ID environment variable
        const child = spawn('npx', ['tsx', 'scripts/sync-vpn-singbox-minimal.ts'], {
          env: {
            ...process.env,
            TARGET_NODE_ID: id
          }
        })

        child.stdout.on('data', (data) => {
          controller.enqueue(data)
        })

        child.stderr.on('data', (data) => {
          controller.enqueue(data)
        })

        child.on('close', (code) => {
          if (code !== 0) {
            controller.enqueue(new TextEncoder().encode(`\nProcess exited with code ${code}\n`))
          } else {
            controller.enqueue(new TextEncoder().encode('\nDeployment completed successfully.\n'))
          }
          controller.close()
        })

        child.on('error', (err) => {
          controller.enqueue(new TextEncoder().encode(`\nFailed to start process: ${err.message}\n`))
          controller.close()
        })
      }
    })

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
