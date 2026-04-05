import { Client } from 'ssh2'
import prisma from '@/lib/db'

const nodes = [
  { id: 'germany1', host: '94.156.179.93', pass: process.env.VPN_NODE_PASSWORD || '' },
  { id: 'netherlands1', host: '45.84.222.96', pass: process.env.VPN_NODE_PASSWORD || '' },
  { id: 'germany2', host: '94.156.114.62', pass: process.env.VPN_NODE_PASSWORD || '' }
]

async function getNewKeys(node: any): Promise<{ privateKey: string, publicKey: string } | null> {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec('sing-box generate reality-keypair', (err, stream) => {
        if (err) return resolve(null)
        let output = ''
        stream.on('data', d => output += d.toString())
        stream.on('close', () => {
          console.log(`Command finished for ${node.id}. Output length: ${output.length}`)
          conn.end()
          const privMatch = output.match(/PrivateKey: (.*)/)
          const pubMatch = output.match(/PublicKey: (.*)/)
          if (privMatch && pubMatch) {
            console.log(`Successfully parsed keys for ${node.id}`)
            resolve({ privateKey: privMatch[1].trim(), publicKey: pubMatch[1].trim() })
          } else {
            console.error(`Failed to parse keys for ${node.id}. Raw output: ${output}`)
            resolve(null)
          }
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
  console.log('Starting Reality fix...')
  for (const node of nodes) {
    console.log(`Connecting to ${node.id} (${node.host})...`)
    const keys = await getNewKeys(node)
    if (keys) {
      console.log(`New keys for ${node.id}: Pub=${keys.publicKey}`)
      try {
        await prisma.location.update({
          where: { id: node.id },
          data: {
            vlessRealityPrivateKey: keys.privateKey,
            vlessRealityPublicKey: keys.publicKey
          }
        })
        console.log(`Database updated for ${node.id}`)
      } catch (e: any) {
        console.error(`Database update FAILED for ${node.id}:`, e.message)
      }
    } else {
      console.error(`Failed to get keys for ${node.id}`)
    }
  }
  console.log('Done updating database.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
