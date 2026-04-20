import { PrismaNeon } from "@prisma/adapter-neon"

import { PrismaClient } from "@/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
