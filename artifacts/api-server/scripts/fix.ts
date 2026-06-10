import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log('Migrating SQUADCO records to PAYSTACK...');
  
  await prisma.$executeRawUnsafe(`UPDATE orders SET "paymentMethod" = 'WALLET'::"PaymentMethod" WHERE "paymentMethod"::text = 'SQUADCO'`);
  
  await prisma.$executeRawUnsafe(`UPDATE wallet_transactions SET "source" = 'ADMIN'::"WalletTxnSource" WHERE "source"::text = 'SQUADCO'`);
  
  console.log('Records updated successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
