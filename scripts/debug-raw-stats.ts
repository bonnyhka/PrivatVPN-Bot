import { Client } from 'ssh2';
import prisma from '@/lib/db';

async function main() {
  const node = await prisma.location.findFirst({ where: { id: 'germany1' } });
  if (!node) return;

  const conn = new Client();
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
    conn.exec(`${setupProto} && grpcurl -plaintext -import-path /tmp -proto stats.proto -d '{"pattern":"","reset":false}' 127.0.0.1:10086 v2ray.core.app.stats.command.StatsService.QueryStats`, (err, stream) => {
      if (err) throw err;
      stream.on('data', d => process.stdout.write(d.toString()));
      stream.on('stderr', d => process.stderr.write(d.toString()));
      stream.on('close', () => {
        conn.end();
        process.exit(0);
      });
    });
  }).connect({
    host: node.host,
    port: 22,
    username: 'root',
    password: node.sshPass
  });
}

main().catch(console.error);
