import prisma from '@/lib/db'

async function main() {
  const subs = await prisma.subscription.findMany({ include: { user: true } })
  console.log('SUBSCRIPTIONS:', JSON.stringify(subs, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
