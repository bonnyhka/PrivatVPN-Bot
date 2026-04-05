const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL)
  try {
    const users = await prisma.user.findMany({ take: 1 })
    console.log('Success! Users found:', users.length)
    if (users.length > 0) {
      console.log('User 1 keys:', Object.keys(users[0]))
    }
  } catch (err) {
    console.error('Error querying users:', err.message)
    if (err.message.includes('no such column')) {
      console.log('Detected missing column in DB!')
    }
  }
}

main().finally(() => prisma.$disconnect())
