import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const locs = await prisma.location.findMany();
  console.log(JSON.stringify(locs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
