const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Adding missing columns to User table...')
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE User ADD COLUMN avatar TEXT;')
    console.log('Added avatar column.')
  } catch (e) {
    console.log('Avatar column might already exist or error:', e.message)
  }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE User ADD COLUMN referralCode TEXT;')
    console.log('Added referralCode column.')
  } catch (e) {
    console.log('ReferralCode column might already exist or error:', e.message)
  }
  
  // Also fix Location if needed
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE Location ADD COLUMN name TEXT;')
    console.log('Added name column to Location.')
  } catch (e) {
    console.log('Name column in Location might already exist or error:', e.message)
  }

  console.log('Granting owner role to 5005525666...')
  try {
    await prisma.user.updateMany({
      where: { telegramId: '5005525666' },
      data: { role: 'owner' }
    })
    console.log('Granted owner role.')
  } catch (e) {
    console.log('Error granting owner role:', e.message)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
