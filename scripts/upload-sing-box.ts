import prisma from '@/lib/db'
import { Client } from 'ssh2'

async function uploadFile(host: string, pass: string) {
  return new Promise((resolve) => {
    const conn = new Client()
    console.log(`[${host}] Uploading custom sing-box binary...`)
    
    conn.on('ready', () => {
      conn.exec('systemctl stop sing-box', (err, stream) => {
        stream.on('close', () => {
          conn.sftp((err, sftp) => {
            if (err) { console.error(err); conn.end(); return resolve(false) }
            sftp.fastPut('/root/sing-box-custom', '/usr/bin/sing-box', { step: (total, curr) => console.log(`[${host}] ${Math.round(curr/total*100)}%`) }, (err) => {
              if (err) { console.error(err); conn.end(); return resolve(false) }
              conn.exec('chmod +x /usr/bin/sing-box', () => {
                console.log(`[${host}] Upload complete and permissions set.`)
                conn.end()
                resolve(true)
              })
            })
          })
        })
      })
    }).on('error', (err) => {
      console.error(`[${host}] Connection error:`, err.message)
      resolve(false)
    }).connect({
      host,
      port: 22,
      username: 'root',
      password: pass,
      readyTimeout: 15000
    })
  })
}

async function main() {
  const locations = await prisma.location.findMany({ where: { isActive: true, sshPass: { not: null } } })
  const promises = locations.map(l => uploadFile(l.host, l.sshPass || process.env.VPN_NODE_PASSWORD || ''))
  await Promise.all(promises)
  console.log('Finished uploading to all servers.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
