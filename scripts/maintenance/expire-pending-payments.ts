import prisma from '@/lib/db'
import { EXPIRED_PAYMENT_STATUS, PENDING_PAYMENT_STATUS, PENDING_PAYMENT_TTL_MS } from '@/lib/payments'

async function main() {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MS)
  const result = await prisma.payment.updateMany({
    where: {
      status: PENDING_PAYMENT_STATUS,
      createdAt: { lt: cutoff },
    },
    data: {
      status: EXPIRED_PAYMENT_STATUS,
      updatedAt: new Date(),
    },
  })

  console.log(`[${new Date().toISOString()}] Expired pending payments older than 1 hour: ${result.count}`)
}

main()
  .catch((error) => {
    console.error('Expire pending payments failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
