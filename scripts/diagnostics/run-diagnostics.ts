import { Client } from 'ssh2'
import * as fs from 'fs'
import { decryptField } from '../lib/field-encryption'
import prisma from '../lib/db'

async function runOnNode(loc: any) {
  return new Promise<string>((resolve) => {
    const conn = new Client()
    const script = fs.readFileSync('/root/PrivatVPN-Bot/scripts/test-stats-api.sh', 'utf8')
    conn.on('ready', () => {
      conn.exec(`bash -c '${script.replace(/'/g, "'\\''")}'`, (err, stream) => {
        if (err) { conn.end(); return resolve('ERROR: ' + err.message) }
        let out = ''
        stream.on('data', (d: Buffer) => out += d.toString())
        stream.stderr.on('data', (d: Buffer) => out += d.toString())
        stream.on('close', () => { conn.end(); resolve(out) })
      })
    }).on('error', (e: Error) => resolve('SSH ERROR: ' + e.message))
    .connect({ host: loc.host, username: 'root', password: decryptField(loc.sshPass) || '', timeout: 15000 })
  })
}

async function main() {
  const loc = await prisma.location.findUnique({ where: { id: 'germany1' } })
  if (!loc) return
  console.log(`=== ${loc.name} (${loc.host}) ===`)
  const result = await runOnNode(loc)
  console.log(result)
}

main().catch(console.error)
