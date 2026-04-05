const { Client } = require('ssh2');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugConnections() {
  const loc = await prisma.location.findFirst({ where: { name: 'Germany #1' } });
  if (!loc) return console.log('Location not found');

  const conn = new Client();
  conn.on('ready', () => {
    console.log('Connected to ' + loc.name);
    // Remove the wc -l to see the actual connections
    const cmd = "ss -tn state established '( sport = :9443 or sport = :10443 or sport = :12443 or sport = :15113 )'";
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let output = '';
      stream.on('data', (data) => output += data.toString());
      stream.on('close', () => {
        const lines = output.split('\n').filter(l => l.trim());
        console.log('Raw SS output (first 20 lines):');
        console.log(lines.slice(0, 20).join('\n'));
        console.log('Total connections found: ' + (lines.length > 0 ? lines.length - 1 : 0));
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

debugConnections().catch(err => {
  console.error(err);
  process.exit(1);
});
