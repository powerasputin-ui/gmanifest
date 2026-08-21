import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // NOTE: do not enable 'query' logging — on Windows the dev server's
    // stdout pipe can fill up and block the whole process.
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// The SQLite file lives inside a OneDrive-synced folder, so transient locks
// from the sync client are expected. Give queries time to wait them out
// instead of failing/hanging on SQLITE_BUSY.
// NOTE: PRAGMA returns a row, so it must go through $queryRawUnsafe —
// $executeRawUnsafe rejects statements that return results on SQLite.
db.$queryRawUnsafe('PRAGMA busy_timeout = 5000').catch(() => {})