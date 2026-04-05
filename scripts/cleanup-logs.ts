import prisma from '@/lib/db'

async function main() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  console.log(`[${new Date().toISOString()}] Starting log cleanup (older than ${thirtyDaysAgo.toISOString()})...`)

  try {
    // 1. Cleanup TrafficLog
    const trafficCount = await prisma.trafficLog.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    })
    console.log(`- Deleted ${trafficCount.count} TrafficLog entries.`)

    // 2. Cleanup ConnectionLog
    const connectionCount = await prisma.connectionLog.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    })
    console.log(`- Deleted ${connectionCount.count} ConnectionLog entries.`)

    // 3. Cleanup SecurityLog
    const securityCount = await prisma.securityLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    })
    console.log(`- Deleted ${securityCount.count} SecurityLog entries.`)

    console.log('Cleanup completed successfully.')
  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
