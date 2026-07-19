import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const maxConnections = parseInt(process.env.DB_POOL_MAX || "5", 10);
  const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10);
  const connectTimeout = parseInt(process.env.DB_CONNECT_TIMEOUT_MS || "5000", 10);

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: maxConnections,
    idleTimeoutMillis: idleTimeout,
    connectionTimeoutMillis: connectTimeout,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
