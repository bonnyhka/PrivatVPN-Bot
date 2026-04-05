import { spawn } from 'child_process'
import path from 'path'

/**
 * Triggers the VPN synchronization script in the background.
 * This function does not wait for the script to finish and resolves immediately,
 * preventing API endpoints from hanging.
 */
export function triggerSync() {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'sync-vpn-singbox.ts')
    
    // Spawn tsx in detached mode so it survives even if the parent request finishes
    const child = spawn('npx', ['tsx', scriptPath], {
      detached: true,
      stdio: 'ignore' // we do not care about output in the web context
    })
    
    // Unreference the child process so the parent doesn't wait for it
    child.unref()
    console.log(`[SYNC] Background synchronization triggered (PID: ${child.pid})`)
  } catch (error) {
    console.error('[SYNC] Failed to trigger background sync:', error)
  }
}
