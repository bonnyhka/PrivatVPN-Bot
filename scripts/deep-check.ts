
import { Client } from 'ssh2'
import prisma from '@/lib/db'

const nodes = [
  { id: 'germany1', host: '94.156.179.93', pass: process.env.VPN_NODE_PASSWORD || '' },
  { id: 'netherlands1', host: '45.84.222.96', pass: process.env.VPN_NODE_PASSWORD || '' },
  { id: 'germany2', host: '94.156.114.62', pass: process.env.VPN_NODE_PASSWORD || '' }
]

async function deepCheck(node: any) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      console.log(`\n--- DEEP CHECK: ${node.id} (${node.host}) ---`)
      const cmd = `
        echo "LOGS (Last 50 lines):"
        journalctl -u sing-box -n 50 --no-pager
        echo "PORT 443 STATUS:"
        netstat -tulpn | grep :443 || echo "Port 443 is FREE"
        echo "CONFIG JSON (Keys and Ports):"
        grep -E "listen_port|private_key" /etc/sing-box/config.json || true
      `
      conn.exec(cmd, (err, stream) => {
        if (err) return resolve(false)
        stream.on('data', d => process.stdout.write(d)).on('stderr', d => process.stderr.write(d)).on('close', () => {
          conn.end()
          resolve(true)
        })
      })
    }).on('error', (err) => {
      console.error(`Connection error to ${node.id}:`, err.message)
      resolve(false)
    }).connect({
      host: node.host,
      port: 22,
      username: 'root',
      password: node.pass
    })
  })
}

async function main() {
  for (const node of nodes) {
    await deepCheck(node)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
