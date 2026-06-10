import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating SQUADCO records to PAYSTACK...');
  
  await prisma.$executeRawUnsafe(`UPDATE orders SET "paymentMethod" = 'PAYSTACK'::"PaymentMethod" WHERE "paymentMethod"::text = 'SQUADCO'`);
  
  await prisma.$executeRawUnsafe(`UPDATE wallet_transactions SET "source" = 'PAYSTACK'::"WalletTxnSource" WHERE "source"::text = 'SQUADCO'`);
  
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
