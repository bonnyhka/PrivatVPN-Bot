import { Client } from 'ssh2';
import prisma from './lib/db';

async function debugConnections() {
  const loc = await prisma.location.findFirst({ where: { name: 'Netherlands #1' } });
  if (!loc) return console.log('Location not found');

  const conn = new Client();
  conn.on('ready', () => {
    console.log('Connected to ' + loc.name);
    // Remove the wc -l to see the actual connections
    const cmd = "ss -tn state established '( sport = :9443 or sport = :10443 or sport = :12443 or sport = :15113 )'";
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let output = '';
      stream.on('data', (data: Buffer) => output += data.toString());
      stream.on('close', () => {
        console.log('Raw SS output (first 20 lines):');
        console.log(output.split('\n').slice(0, 20).join('\n'));
        console.log('Total lines: ' + output.split('\n').filter(l => l.trim()).length);
        conn.end();
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
