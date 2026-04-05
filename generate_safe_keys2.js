const crypto = require('crypto');
function genSafeKeys() {
  while (true) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
    const pub = publicKey.export({ type: 'spki', format: 'der' }).subarray(12).toString('base64url');
    const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(16).toString('base64url');
    if (!pub.includes('_') && !pub.includes('-') && !priv.includes('_') && !priv.includes('-')) {
      return { pub, priv };
    }
  }
}
const k = genSafeKeys();
console.log('PublicKey:', k.pub);
console.log('PrivateKey:', k.priv);
