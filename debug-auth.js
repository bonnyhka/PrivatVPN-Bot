const { Client } = require('ssh2');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAuth() {
  const loc = await prisma.location.findFirst({ where: { name: 'Germany #1' } });
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
    // reset: false to see cumulative traffic
    const queryCmd = `grpcurl -plaintext -import-path /tmp -proto stats.proto -d '{"pattern":"","reset":false}' 127.0.0.1:10086 v2ray.core.app.stats.command.StatsService.QueryStats`;
    
    conn.exec(setupProto + " && " + queryCmd, (err, stream) => {
      if (err) throw err;
      let output = '';
      stream.on('data', (d) => output += d.toString()).stderr.on('data', d => console.log('ERR: ' + d));
      stream.on('close', () => {
        try {
          const parsed = JSON.parse(output.trim() || '{"stat":[]}');
          const stats = parsed.stat || [];
          const users = new Set();
          for (const s of stats) {
            if (s.name.startsWith('user>>>') && s.value > 0) {
              users.add(s.name.split('>>>')[1]);
            }
          }
          console.log('Authenticated users with traffic:');
          console.log(Array.from(users));
          console.log('Total Authenticated: ' + users.size);
        } catch(e) {
          console.log('Got: ' + output);
        }
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

debugAuth().catch(console.error);
