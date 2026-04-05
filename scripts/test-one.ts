import { Client } from 'ssh2';
import prisma from '@/lib/db';

async function main() {
  console.log("Starting main...");
  const node = await prisma.location.findFirst({ where: { id: 'germany1' } });
  if (!node) {
    console.error("Node germany1 not found");
    return;
  }
  console.log(`Connecting to ${node.host}...`);

  const conn = new Client();
  conn.on('ready', () => {
    console.log("Connected. Executing command...");
    conn.exec('ps -ef | grep sing-box | grep -v grep; grep "10086" /etc/sing-box/config.json; ss -tulpn | grep 10086', (err, stream) => {
      if (err) {
        console.error("Exec error:", err);
        conn.end();
        process.exit(1);
      }
      stream.on('data', d => {
        console.log("OUT:", d.toString());
      });
      stream.on('stderr', d => {
        console.error("ERR:", d.toString());
      });
      stream.on('close', () => {
        console.log("Stream closed.");
        conn.end();
        process.exit(0);
      });
    });
  }).on('error', err => {
    console.error("Connection error:", err);
    process.exit(1);
  }).connect({
    host: node.host,
    port: 22,
    username: 'root',
    password: node.sshPass,
    readyTimeout: 10000
  });
}

main().catch(err => {
  console.error("Main catch:", err);
  process.exit(1);
});
