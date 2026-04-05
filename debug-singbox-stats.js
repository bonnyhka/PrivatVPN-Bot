const { Client } = require('ssh2');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSingbox() {
  const loc = await prisma.location.findFirst({ where: { name: 'Netherlands #1' } });
  if (!loc) return console.log('Location not found');

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
    // We use reset: false to see everyone who has had traffic
    const queryCmd = `grpcurl -plaintext -import-path /tmp -proto stats.proto -d '{"pattern":"","reset":false}' 127.0.0.1:10086 v2ray.core.app.stats.command.StatsService.QueryStats`;
    
    conn.exec(setupProto + " && " + queryCmd, (err, stream) => {
      if (err) throw err;
      let output = '';
      stream.on('data', (d) => output += d.toString());
      stream.on('close', () => {
        console.log('Sing-box Stats Output:');
        console.log(output);
        conn.end();
        process.exit(0);
      });
    });
  }).connect({
    host: loc.host,
    port: 22,
    username: 'root',
    password: loc.sshPass
  });
}

debugSingbox().catch(console.error);
