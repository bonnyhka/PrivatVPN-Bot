import { NextResponse } from 'next/server'
import { spawn } from 'child_process'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()
    
    const { id } = await params

    const encoder = new TextEncoder()
    const write = (controller: ReadableStreamDefaultController<Uint8Array>, chunk: string) => {
      controller.enqueue(encoder.encode(chunk))
    }

    const runStep = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      label: string,
      command: string,
      args: string[]
    ) =>
      new Promise<boolean>((resolve) => {
        write(controller, `\n=== ${label} ===\n`)

        const child = spawn(command, args, {
          cwd: process.cwd(),
          env: {
            ...process.env,
            TARGET_NODE_ID: id,
          },
        })

        child.stdout.on('data', (data) => controller.enqueue(data))
        child.stderr.on('data', (data) => controller.enqueue(data))

        child.on('close', (code) => {
          if (code === 0) {
            write(controller, `\n[OK] ${label}\n`)
            resolve(true)
            return
          }

          write(controller, `\n[FAIL] ${label} (exit ${code ?? 'unknown'})\n`)
          resolve(false)
        })

        child.on('error', (err) => {
          write(controller, `\n[FAIL] ${label}: ${err.message}\n`)
          resolve(false)
        })
      })

    const customStream = new ReadableStream({
      start(controller) {
        ;(async () => {
          const provisioned = await runStep(
            controller,
            'Установка и синхронизация узла',
            'npx',
            ['tsx', 'scripts/sync-vpn-singbox-minimal.ts']
          )

          if (!provisioned) {
            write(controller, '\nProvisioning aborted.\n')
            controller.close()
            return
          }

          const diagnosticsUpdated = await runStep(
            controller,
            'Первичная диагностика новой локации',
            'node',
            ['scripts/update-location-diagnostics.js', '--once']
          )

          if (!diagnosticsUpdated) {
            write(
              controller,
              '\nDeployment completed, but diagnostics refresh failed. The node may appear fully in status after the background monitor cycle.\n'
            )
          } else {
            write(
              controller,
              '\nDeployment completed successfully. Live speed monitor will attach the new node automatically within about a minute.\n'
            )
          }

          controller.close()
        })().catch((err) => {
          write(controller, `\nFailed to start provisioning flow: ${err.message}\n`)
          controller.close()
        })
      },
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
