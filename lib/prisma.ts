import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` in development to preserve PrismaClient across module reloads
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma
