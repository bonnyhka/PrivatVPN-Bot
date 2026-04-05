/**
 * One-time migration: encrypt Location.sshPass, vlessRealityPrivateKey, ssPassword at rest.
 * Requires SECRETS_ENCRYPTION_KEY (same as production) so ciphertext is consistent.
 *
 * Usage: SECRETS_ENCRYPTION_KEY=... pnpm exec tsx scripts/migrate-encrypt-location-secrets.ts
 */
import prisma from '@/lib/db'
import { isEncryptedField } from '@/lib/field-encryption'

async function main() {
  const locations = await prisma.location.findMany()
  let updated = 0
  for (const loc of locations) {
    const needs =
      (loc.sshPass && !isEncryptedField(loc.sshPass)) ||
      (loc.vlessRealityPrivateKey && !isEncryptedField(loc.vlessRealityPrivateKey)) ||
      (loc.ssPassword && !isEncryptedField(loc.ssPassword))
    if (!needs) continue

    await prisma.location.update({
      where: { id: loc.id },
      data: {
        sshPass: loc.sshPass,
        vlessRealityPrivateKey: loc.vlessRealityPrivateKey,
        ssPassword: loc.ssPassword,
      },
    })
    updated++
    console.log('encrypted:', loc.id, loc.name)
  }
  console.log('Done. Rows re-written:', updated, '/', locations.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
