// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const isAccelerate = url.startsWith("prisma+") || url.startsWith("prisma://");
  const log = ["warn", "error"];
  if (isAccelerate) {
    const client2 = new PrismaClient({ accelerateUrl: url, log });
    return client2.$extends(withAccelerate());
  }
  const adapter = new PrismaPg({ connectionString: url });
  const client = new PrismaClient({ adapter, log });
  return client.$extends(withAccelerate());
}
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? createPrismaClient();

// scripts/fix.ts
async function main() {
  console.log("Migrating SQUADCO records to PAYSTACK...");
  await prisma.$executeRawUnsafe(`UPDATE orders SET "paymentMethod" = 'WALLET'::"PaymentMethod" WHERE "paymentMethod"::text = 'SQUADCO'`);
  await prisma.$executeRawUnsafe(`UPDATE wallet_transactions SET "source" = 'ADMIN'::"WalletTxnSource" WHERE "source"::text = 'SQUADCO'`);
  console.log("Records updated successfully.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
