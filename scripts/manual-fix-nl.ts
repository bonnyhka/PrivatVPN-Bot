import { Client } from 'ssh2'
import fs from 'fs'

const conn = new Client()
conn.on('ready', () => {
  console.log('SSH Connection Ready!')
  const config = {
    log: { level: 'info', timestamp: true },
    dns: {
      servers: [
        { tag: 'google', address: '8.8.8.8', detour: 'direct' },
        { tag: 'local', address: 'local', detour: 'direct' }
      ],
      final: 'google'
    },
    inbounds: [
      {
        type: 'vless',
        tag: 'vless-in-12443',
        listen: '::',
        listen_port: 12443,
        sniff: true,
        users: [{ uuid: '0e4a14cb-6ef2-4dbe-a8c8-892ebe0556f4' }],
        tls: {
          enabled: true,
          server_name: 'www.microsoft.com',
          reality: {
            enabled: true,
            handshake: { server: 'www.microsoft.com', server_port: 443 },
            private_key: '2LMX2xr3JxFnGvHxMkOJfMlX3sQMiOl1zvaYKoDunXg',
            short_id: ['9f10e304859bc070']
          }
        }
      },
      {
        type: 'shadowsocks',
        tag: 'ss-in-15113',
        listen: '::',
        listen_port: 15113,
        method: 'chacha20-ietf-poly1305',
        password: '0e4a14cb-6ef2-4dbe-a8c8-892ebe0556f4'
      },
      {
        type: 'hysteria2',
        tag: 'hy2-in-443',
        listen: '::',
        listen_port: 443,
        password: '0e4a14cb-6ef2-4dbe-a8c8-892ebe0556f4',
        tls: {
          enabled: true,
          certificate_path: '/etc/sing-box/cert.pem',
          key_path: '/etc/sing-box/key.pem'
        }
      }
    ],
    outbounds: [{ type: 'direct', tag: 'direct' }]
  }

  const cmd = `
    mkdir -p /etc/sing-box &&
    echo '${JSON.stringify(config)}' > /etc/sing-box/config.json &&
    iptables -I INPUT -p tcp --dport 12443 -j ACCEPT &&
    systemctl restart sing-box &&
    systemctl is-active sing-box
  `
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err
    stream.on('clone', () => {
      conn.end()
    }).on('data', (data: Buffer) => {
      console.log('STDOUT: ' + data)
    }).stderr.on('data', (data: Buffer) => {
      console.log('STDERR: ' + data)
    }).on('close', () => {
      console.log('SSH Session Closed')
      conn.end()
      process.exit(0)
    })
  })
}).on('error', (err) => {
  console.error('SSH Error:', err.message)
  process.exit(1)
}).connect({
  host: '45.84.222.96',
  port: 22,
  username: 'root',
  password: 'ovNsFCDTvYWXGl6r1wS5bLXc'
})
