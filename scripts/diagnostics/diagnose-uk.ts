
import { Client } from 'ssh2'

const node = { id: 'uk1', host: '2.27.20.110', pass: process.env.VPN_NODE_PASSWORD || '' }

async function debugNode(node: any) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      console.log(`\n--- DIAGNOSIS: ${node.id} (${node.host}) ---`)
      const cmd = `
        echo "=== Network Interface ==="
        ip route | grep default
        
        echo "=== IPTables ==="
        iptables -L INPUT -n -v
        
        echo "=== Sing-box Status ==="
        systemctl status sing-box --no-pager
        journalctl -u sing-box -n 50 --no-pager
        
        echo "=== Sing-box Config Check ==="
        sing-box check -c /etc/sing-box/config.json
        
        echo "=== Memory/Disk ==="
        free -h
        df -h /
      `
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
      timeout: 20000
    })
  })
}

debugNode(node).catch(console.error)
