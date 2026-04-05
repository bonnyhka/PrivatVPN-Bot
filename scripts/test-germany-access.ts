import { Client } from 'ssh2';
import prisma from '../lib/db';

async function testAccess() {
  const loc = await prisma.location.findUnique({ where: { id: 'germany1' } });
  if (!loc) {
    console.error('Germany #1 not found in DB');
    process.exit(1);
  }

  console.log(`📡 Attempting connection to ${loc.name} (${loc.host}) with 15s timeout...`);
  
  const conn = new Client();
  conn.on('ready', () => {
    console.log('✅ SUCCESS! Connection established via ssh2 library.');
    console.log('📡 Executing test command: uname -a');
    conn.exec('uname -a', (err, stream) => {
      if (err) throw err;
      stream.on('data', (d: Buffer) => console.log('OUT:', d.toString()))
            .on('close', () => {
              conn.end();
              process.exit(0);
            });
    });
  }).on('error', (err) => {
    console.error('❌ FAILED:', err.message);
    process.exit(1);
  }).connect({
    host: loc.host,
    port: 22,
    username: 'root',
    password: loc.sshPass!,
    readyTimeout: 15000
  });
}

testAccess();
