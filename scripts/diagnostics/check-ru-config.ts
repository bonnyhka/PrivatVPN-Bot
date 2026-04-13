import { Client } from 'ssh2'
import prisma from '../lib/db'

async function check() {
  const loc = await (prisma as any).location.findFirst({ where: { name: 'Russia #1 [RU <-> DE]' } })
  const conn = new Client()
  conn.on('ready', () => {
    // Check that sing-box is running, then test connectivity via the NL outbound
    const cmd = `
      journalctl -u sing-box -n 30 --no-pager | grep -iE "nl-outbound|started|failed|error|telegram|openai|facebook" | head -40
    `.trim()
    conn.exec(cmd, (err, stream) => {
      stream.on('data', (d: Buffer) => process.stdout.write(d.toString()))
      stream.on('close', () => {
        // Now try a quick curl through sing-box to test connectivity
        const testCmd = `curl -s --max-time 5 --socks5 127.0.0.1:1080 "https://api.ipify.org" 2>&1 | head -1`
        conn.exec(testCmd, (err2, stream2) => {
          stream2.on('data', (d: Buffer) => console.log('BYEDPI IP:', d.toString().trim()))
          stream2.on('close', () => conn.end())
        })
      })
    })
  }).connect({ host: loc.host, username: 'root', password: loc.sshPass })
}

check().catch(console.error).finally(() => prisma.$disconnect())
