
import { Client } from 'ssh2'
import * as fs from 'fs'

const nodes = [
  { id: 'germany1', host: '94.156.179.93', pass: process.env.VPN_NODE_PASSWORD || '' },
  { id: 'netherlands1', host: '45.84.222.96', pass: process.env.VPN_NODE_PASSWORD || '' },
  { id: 'uk1', host: '2.27.20.110', pass: process.env.VPN_NODE_PASSWORD || '' }
]

async function getConfig(node: any): Promise<string | null> {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec('cat /etc/sing-box/config.json', (err, stream) => {
        if (err) return resolve(null)
        let output = ''
        stream.on('data', d => output += d.toString())
        stream.on('close', () => {
          conn.end()
          resolve(output)
        })
      })
    }).on('error', () => resolve(null)).connect({
      host: node.host,
      port: 22,
      username: 'root',
      password: node.pass
    })
  })
}

async function main() {
  for (const node of nodes) {
    console.log(`\n\n--- CONFIG FROM ${node.id} (${node.host}) ---`)
    const config = await getConfig(node)
    console.log(config)
  }
}

main().catch(console.error)
