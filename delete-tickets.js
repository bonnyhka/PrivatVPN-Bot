const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  await prisma.ticket.deleteMany({})
  console.log('All tickets deleted')
}
main().finally(() => prisma.$disconnect())
