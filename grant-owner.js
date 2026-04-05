// Script to grant owner role to the first user in the DB
// Run: node grant-owner.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' }
  })

  if (!firstUser) {
    console.log('No users in the database yet. Open the Mini App first to register.')
    return
  }

  await prisma.user.update({
    where: { id: firstUser.id },
    data: { role: 'owner' }
  })

  console.log(`Granted owner role to: ${firstUser.firstName || firstUser.username} (TG ID: ${firstUser.telegramId})`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
