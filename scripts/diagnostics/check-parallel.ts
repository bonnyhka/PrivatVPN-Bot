import { Client } from 'ssh2';
import prisma from '@/lib/db';

async function checkServer(node: any) {
  return new Promise((resolve) => {
    console.log(`\n--- Starting check for ${node.name} (${node.host}) ---`);
    const conn = new Client();
    
    const timeout = setTimeout(() => {
      console.error(`\n❌ TIMEOUT for ${node.name} (${node.host})`);
      conn.end();
      resolve(false);
    }, 15000);

    conn.on('ready', () => {
      console.log(`✅ Connected to ${node.name}`);
      conn.exec('ip -s link', (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          console.error(`\n❌ Error on ${node.name}:`, err);
          conn.end();
          return resolve(false);
        }
        stream.on('data', (data: Buffer) => {
          process.stdout.write(`\n[${node.name}] ` + data.toString().trim());
        });
        stream.on('close', () => {
          clearTimeout(timeout);
          conn.end();
          resolve(true);
        });
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      console.error(`\n❌ Connection error for ${node.name}:`, err.message);
      resolve(false);
    }).connect({
      host: node.host,
      port: 22,
      username: node.sshUser || 'root',
      password: node.sshPass,
      readyTimeout: 10000
    });
  });
}

async function main() {
  const nodes = await prisma.location.findMany({
    where: {
      id: { in: ['germany1', 'germany2', 'netherlands1'] }
    }
  });

  await Promise.all(nodes.map(node => checkServer(node)));
}

main().catch(console.error).finally(() => prisma.$disconnect());
