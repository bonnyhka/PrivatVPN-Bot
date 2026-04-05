import prisma from '@/lib/db'
import { Client } from 'ssh2'
async function main() {
  const locs = await prisma.location.findMany({where:{isActive:true}})
  const l = locs.find(l => l.id === 'germany1')
  if(l) {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec('uptime && free -m && ss -s && tc -s qdisc show dev eth0 && ping -c 3 8.8.8.8', (err, stream) => {
        stream.on('data', d => console.log(d.toString())).on('close', () => conn.end())
      })
    }).connect({host: l.host, username: 'root', password: l.sshPass})
  }
}
main()
