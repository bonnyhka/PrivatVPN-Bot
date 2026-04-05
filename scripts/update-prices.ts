import prisma from '@/lib/db'

async function main() {
  const newPrices: Record<string, number> = {
    'scout': 100,
    'guardian': 150,
    'fortress': 220,
    'citadel': 350
  }

  const configs = await prisma.planConfig.findMany()

  for (const config of configs) {
    if (newPrices[config.id]) {
      await prisma.planConfig.update({
        where: { id: config.id },
        data: { price: newPrices[config.id] }
      })
      console.log(`Updated price for ${config.id} to ${newPrices[config.id]}`)
    }
  }

  console.log('Database pricing update completed.')
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
