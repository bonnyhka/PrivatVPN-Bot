const { Client } = require('ssh2');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugConnections() {
  const loc = await prisma.location.findFirst({ where: { name: 'Germany #1' } });
  if (!loc) return console.log('Location not found');

  const conn = new Client();
  conn.on('ready', () => {
    const vpnPorts = "9443,10443,11443,12443,15113,15943,15103,15443";
    const cmd = `ss -tun state established "( dport = :${vpnPorts} or sport = :${vpnPorts} )" | awk '{print $5}' | cut -d: -f1 | sort -u | grep -v Address | grep -v "127.0.0.1" | grep -v "::1" | grep -v "87.120.84.26"`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let output = '';
      stream.on('data', (data) => output += data.toString());
      stream.on('close', () => {
        const ips = output.split('\n').filter(l => l.trim());
        console.log('Unique Peer IPs on ' + loc.name + ':');
        console.log(ips);
        console.log('Total: ' + ips.length);
        conn.end();
        process.exit(0);
      });
    });
  }).connect({
    host: loc.host,
    port: 22,
    username: loc.sshUser || 'root',
    password: loc.sshPass || '',
  });
}

debugConnections().catch(console.error);
