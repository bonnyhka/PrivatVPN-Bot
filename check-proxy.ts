import prisma from '@/lib/db'
import { Client } from 'ssh2'
async function main() {
  const locs = await prisma.location.findMany({where:{isActive:true}})
  const l = locs.find(l => l.id === 'germany1')
  if(l) {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec('journalctl -u sing-box --no-pager -n 30', (err, stream) => {
        stream.on('data', d => console.log(d.toString())).on('close', () => conn.end())
      })
    }).connect({host: l.host, username: 'root', password: l.sshPass})
  }
}
main()
