import prisma from '@/lib/db'
async function main() {
  const locs = await prisma.location.findMany({where:{isActive:true}})
  console.log(locs)
}
main()
