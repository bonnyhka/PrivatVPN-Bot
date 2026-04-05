import { Client } from 'ssh2'

const nodes = [
  { id: 'germany1', host: '94.156.179.93', pass: process.env.VPN_NODE_PASSWORD || '' },
  { id: 'netherlands1', host: '45.84.222.96', pass: process.env.VPN_NODE_PASSWORD || '' },
  { id: 'germany2', host: '94.156.114.62', pass: process.env.VPN_NODE_PASSWORD || '' }
]

async function checkNode(node: any) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      console.log(`\n--- ${node.id} (${node.host}) ---`)
      const cmd = 'systemctl status sing-box --no-pager && journalctl -u sing-box -n 20 --no-pager'
      conn.exec(cmd, (err, stream) => {
        if (err) {
          console.error(`Error executing command on ${node.id}:`, err)
          conn.end()
          return resolve(false)
        }
        stream.on('data', (d: any) => process.stdout.write(d)).on('stderr', (d: any) => process.stderr.write(d)).on('close', () => {
          conn.end()
          resolve(true)
        })
      })
    }).on('error', (err) => {
      console.error(`Connection error to ${node.id} (${node.host}):`, err.message)
      resolve(false)
    }).connect({
      host: node.host,
      port: 22,
      username: 'root',
      password: node.pass,
      timeout: 10000
    })
  })
}

async function main() {
  for (const node of nodes) {
    await checkNode(node)
  }
}

main().catch(console.error)
