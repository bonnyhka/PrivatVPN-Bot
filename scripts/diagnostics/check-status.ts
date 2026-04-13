import { Client } from 'ssh2';
import prisma from '@/lib/db';

async function checkServer(node: any) {
  console.log(`\n--- Checking ${node.name} (${node.host}) ---`);
  const conn = new Client();
  
  return new Promise((resolve) => {
    conn.on('ready', () => {
      const setupProto = `cat > /tmp/stats.proto << 'PROTOEOF'
syntax = "proto3";
package v2ray.core.app.stats.command;
service StatsService {
  rpc QueryStats (QueryStatsRequest) returns (QueryStatsResponse);
}
message QueryStatsRequest {
  string pattern = 1;
  bool reset = 2;
}
message QueryStatsResponse {
  repeated Stat stat = 1;
}
message Stat {
  string name = 1;
  int64 value = 2;
}
PROTOEOF
`;
      const rescue = `
        for i in eth0 ens3 eth1 ens4; do
          tc qdisc del dev $i root 2>/dev/null || true
          tc qdisc del dev $i ingress 2>/dev/null || true
        done
        tc qdisc del dev ifb0 root 2>/dev/null || true
        iptables -P INPUT ACCEPT
        iptables -F
        iptables -X
        iptables -t nat -F
        iptables -t mangle -F
        echo "RESCUE_DONE"
      `;
      conn.exec('ls -lh /etc/sing-box/config.json; jq "." /etc/sing-box/config.json > /dev/null && echo "JSON_OK" || echo "JSON_ERROR"', (err, stream) => {
        if (err) {
          console.error(`Error executing on ${node.host}:`, err);
          conn.end();
          return resolve(false);
        }
        stream.on('data', (data: Buffer) => {
          process.stdout.write(data.toString());
        });
        stream.on('stderr', (data: Buffer) => {
          process.stderr.write('ERR: ' + data.toString());
        });
        stream.on('close', () => {
          conn.end();
          resolve(true);
        });
      });
    }).on('error', (err) => {
      console.error(`Connection error for ${node.host}:`, err.message);
      resolve(false);
    }).connect({
      host: node.host,
      port: 22,
      username: node.sshUser || 'root',
      password: node.sshPass
    });
  });
}

async function main() {
  const nodes = await prisma.location.findMany({
    where: {
      id: { in: ['germany1', 'germany2', 'netherlands1'] }
    }
  });

  for (const node of nodes) {
    await checkServer(node);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
