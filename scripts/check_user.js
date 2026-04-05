const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { telegramId: '7923347249' }
  })
  console.log('User 7923347249:', JSON.stringify(user, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2))

  const usersWithoutRef = await prisma.user.findMany({
    where: { OR: [{ referralCode: null }, { referralCode: '' }] }
  })
  console.log('Users without referral code:', usersWithoutRef.length)
  if (usersWithoutRef.length > 0) {
    console.log('First 5 users without ref code:', usersWithoutRef.slice(0, 5).map(u => u.telegramId))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
