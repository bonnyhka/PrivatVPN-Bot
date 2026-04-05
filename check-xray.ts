import prisma from '@/lib/db'
import { Client } from 'ssh2'

async function main() {
  const locs = await prisma.location.findMany({where:{isActive:true}})
  for(const l of locs) {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec('which xray || ls /usr/local/bin/xray', (err, stream) => {
        stream.on('data', d => console.log(l.name, d.toString())).on('close', () => conn.end())
      })
    }).connect({host: l.host, username: 'root', password: l.sshPass})
  }
}
main()
