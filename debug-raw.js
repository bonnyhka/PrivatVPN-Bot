const { Client } = require('ssh2');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugRaw() {
  const loc = await prisma.location.findFirst({ where: { name: 'Germany #1' } });
  if (!loc) return console.log('Location not found');

  const userIp = '37.55.158.127';
  const conn = new Client();
  conn.on('ready', () => {
    // Run UNFILTERED ss to find the user
    const cmd = `ss -tun state established`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let output = '';
      stream.on('data', (data) => output += data.toString());
      stream.on('close', () => {
        const lines = output.split('\n');
        console.log('Searching for ' + userIp + ' in raw output...');
        const matches = lines.filter(l => l.includes(userIp));
        if (matches.length > 0) {
          console.log('Found matches:');
          console.log(matches.join('\n'));
        } else {
          console.log('User IP NOT FOUND in raw established connections.');
          console.log('First 10 lines of raw output:');
          console.log(lines.slice(0, 10).join('\n'));
        }
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

debugRaw().catch(console.error);
