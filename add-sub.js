const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const telegramId = process.argv[2]
  if (!telegramId) {
    console.error('Usage: node add-sub.js <telegram_id>')
    process.exit(1)
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { telegramId }
  })

  if (!user) {
    console.error(`User with Telegram ID ${telegramId} not found. Please open the Mini App at least once to register.`)
    process.exit(1)
  }

  // Check if they already have one
  const existingSub = await prisma.subscription.findUnique({
    where: { userId: user.id }
  })

  if (existingSub) {
    console.log(`User already has a subscription. Updating expiration...`)
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // + 30 days
        status: 'active'
      }
    })
    console.log('Subscription extended for 30 days.')
    process.exit(0)
  }

  // Create new subscription for them: Guardian plan
  await prisma.subscription.create({
    data: {
      userId: user.id,
      planId: 'guardian',
      status: 'active',
      vpnKey: `vless://${telegramId}@nl1.privatevp.space:443?type=ws&security=tls`,
      autoRenew: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  })

  console.log(`Successfully added a new 'Guardian' subscription for user ${telegramId}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
