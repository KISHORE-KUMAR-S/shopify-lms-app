import { PrismaClient } from "@prisma/client";

import { env } from "./env.js";

/**
 * Reused across hot reloads in development so `tsx watch` does not exhaust the
 * Postgres connection pool.
 */
const globalForPrisma = globalThis as unknown as {
  prismaGlobal?: PrismaClient;
};

export const prisma =
  globalForPrisma.prismaGlobal ??
  new PrismaClient({
    log: env.isProduction ? ["error"] : ["warn", "error"],
  });

if (!env.isProduction) {
  globalForPrisma.prismaGlobal = prisma;
}
