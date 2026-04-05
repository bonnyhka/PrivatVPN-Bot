import prisma from './lib/db'
import { Client } from 'ssh2'

const locs = await prisma.location.findMany({ where: { isActive: true, sshPass: { not: null } } })
for (const loc of locs) {
  console.log(`=== ${loc.name} ===`)
  await new Promise((res) => {
    const conn = new Client()
    const cmd = `
      IFACE=$(ip route show default | awk '/default/ {print $5; exit}')
      tc qdisc replace dev $IFACE root fq quantum 1514 flow_limit 200 2>/dev/null && echo "fq OK on $IFACE" || echo "fq FAIL"
      tc qdisc show dev $IFACE
      systemctl is-active sing-box
    `.trim()
    conn.on('ready', () => {
      conn.exec(cmd, (e, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()))
        stream.on('close', () => { conn.end(); res(null) })
      })
    }).connect({ host: loc.host, port: 22, username: 'root', password: loc.sshPass })
    conn.on('error', e => { console.log(`SSH err: ${e.message}`); res(null) })
  })
}
prisma.$disconnect()
