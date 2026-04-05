import prisma from '@/lib/db'

async function main() {
  await prisma.location.update({ 
    where: { id: 'germany1' }, 
    data: { 
      vlessRealityPrivateKey: 'MB0nUhWhfaoR0zwHWlVZI88uDCYV6tQ0m0qFleRK-FE', 
      vlessRealityPublicKey: 'UMLqkRei8uHZbxKrXgxN6FggzN9keAEle2RkBkcczkM' 
    } 
  })
  await prisma.location.update({ 
    where: { id: 'germany2' }, 
    data: { 
      vlessRealityPrivateKey: '8EBCpU0-gOr9FzvrGZlFGnIUYaW0Lrnqn5MMKIRwb3c', 
      vlessRealityPublicKey: 'Bzc5WG4hBK9is2wfeIk4jN7L-TN0JfRdGLctgVdB7Hc' 
    } 
  })
  console.log('DB UPDATED FOR BOTH GERMANY SERVERS')
}

main().catch(console.error).finally(() => prisma.$disconnect())
