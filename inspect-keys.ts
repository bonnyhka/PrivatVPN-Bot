import prisma from '@/lib/db'

async function main() {
  const loc = await prisma.location.findUnique({ where: { id: 'germany1' } })
  console.log('GERMANY1_DB_DATA:', JSON.stringify(loc))
}

main().catch(console.error).finally(() => prisma.$disconnect())
