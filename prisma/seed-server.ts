import prisma from '@/lib/db'
import crypto from 'crypto'
import { createStrongPassword } from '../lib/security'

async function main() {
  const bootstrapUuid = crypto.randomUUID()
  const bootstrapSsPassword = createStrongPassword(28)

  // Add Germany #1
  await prisma.location.upsert({
    where: { id: 'germany1' },
    update: {
      name: 'Germany #1',
      country: 'Германия',
      flag: '🇩🇪',
      host: '94.156.179.93',
      isActive: true,
      ping: 45,
      load: 12,
      ssPort: 8443,
      ssPassword: bootstrapSsPassword,
      ssMethod: 'chacha20-ietf-poly1305',
      vlessUuid: bootstrapUuid,
      vlessPort: 443,
      vlessNetwork: 'tcp', // Reality uses TCP
      vlessTls: true, // Reality uses TLS (mimic)
      vlessReality: true,
      vlessRealityPublicKey: 'cxMEjVYc7Jse_qSmWvjgaBOS1wYxtn-2th4VElyrfmk',
      vlessRealityShortId: '8e70f204859bc060', // Random 8-byte hex
      vlessRealitySni: 'www.microsoft.com', sshUser: 'root', sshPass: process.env.VPN_NODE_PASSWORD || '',
    },
    create: {
      id: 'germany1',
      name: 'Germany #1',
      country: 'Германия',
      flag: '🇩🇪',
      host: '94.156.179.93',
      isActive: true,
      ping: 45,
      load: 12,
      ssPort: 8443,
      ssPassword: bootstrapSsPassword,
      ssMethod: 'chacha20-ietf-poly1305',
      vlessUuid: bootstrapUuid,
      vlessPort: 443,
      vlessNetwork: 'tcp',
      vlessTls: true,
      vlessReality: true,
      vlessRealityPublicKey: 'cxMEjVYc7Jse_qSmWvjgaBOS1wYxtn-2th4VElyrfmk',
      vlessRealityShortId: '8e70f204859bc060',
      vlessRealitySni: 'www.microsoft.com', sshUser: 'root', sshPass: process.env.VPN_NODE_PASSWORD || '',
    } as any
  })

  console.log('Seeded Germany #1 with REALITY support')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
