const { execSync } = require('child_process');

let safe = false;
let priv = '';
let pub = '';

while(!safe) {
  const output = execSync('sing-box generate reality-keypair').toString();
  // output format:
  // PrivateKey: xxx
  // PublicKey: yyy
  const lines = output.split('\n');
  priv = lines[0].split(': ')[1].trim();
  pub = lines[1].split(': ')[1].trim();
  
  if (!priv.includes('_') && !priv.includes('-') && !pub.includes('_') && !pub.includes('-')) {
    safe = true;
  }
}
console.log('priv:', priv);
console.log('pub:', pub);
