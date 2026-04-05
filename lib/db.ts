import { PrismaClient } from '@prisma/client'
import { decryptLocationResult, encryptLocationArgs } from './field-encryption'

const SQLITE_PRAGMAS = [
  'PRAGMA journal_mode = WAL',
  'PRAGMA synchronous = NORMAL',
  'PRAGMA foreign_keys = ON',
  'PRAGMA temp_store = MEMORY',
  'PRAGMA busy_timeout = 5000',
  'PRAGMA cache_size = -20000',
  'PRAGMA mmap_size = 268435456',
  'PRAGMA secure_delete = ON',
]

function createExtendedClient() {
  const base = new PrismaClient()
  return base.$extends({
    query: {
      location: {
        async $allOperations({ operation, args, query }) {
          const nextArgs = encryptLocationArgs(operation, args as Record<string, unknown>) as typeof args
          const data = await query(nextArgs)
          return decryptLocationResult(operation, data) as typeof data
        },
      },
    },
  })
}

const prismaClientSingleton = () => createExtendedClient()

type GlobalPrisma = typeof globalThis & {
  prismaGlobal?: ReturnType<typeof prismaClientSingleton>
  prismaInitPromise?: Promise<void>
}

const globalForPrisma = globalThis as GlobalPrisma
const prisma = globalForPrisma.prismaGlobal ?? prismaClientSingleton()

async function initSqlitePragmas() {
  if (!process.env.DATABASE_URL?.startsWith('file:')) return

  for (const pragma of SQLITE_PRAGMAS) {
    await prisma.$queryRawUnsafe(pragma)
  }

  await prisma.$queryRawUnsafe('PRAGMA optimize')
}

const prismaInitPromise =
  globalForPrisma.prismaInitPromise ??
  prisma
    .$connect()
    .then(initSqlitePragmas)
    .catch((error) => {
      console.error('[db] SQLite init failed:', error)
      throw error
    })

export default prisma
export { prismaInitPromise }

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = prisma
  globalForPrisma.prismaInitPromise = prismaInitPromise
}
