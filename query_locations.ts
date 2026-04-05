import prisma from '@/lib/db'

async function main() {
  const locations = await prisma.location.findMany()
  console.log(JSON.stringify(locations, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
