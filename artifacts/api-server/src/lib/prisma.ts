import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Creates a Prisma client. Supports both Prisma Accelerate (prisma+postgres://)
 * and direct PostgreSQL (postgresql://) connection URLs.
 */
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const isAccelerate = url.startsWith("prisma+") || url.startsWith("prisma://");
  const log: any = ["warn", "error"];

  if (isAccelerate) {
    const client = new PrismaClient({ datasourceUrl: url, log });
    return client.$extends(withAccelerate());
  }

  const adapter = new PrismaPg({ connectionString: url });
  const client = new PrismaClient({ adapter, log });
  return client.$extends(withAccelerate()); // harmless on direct connection
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
