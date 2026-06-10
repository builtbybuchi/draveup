import pg from 'pg';
const { Client } = pg;

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    console.error("DIRECT_URL not found in environment variables");
    process.exit(1);
  }
  
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Migrating SQUADCO records to PAYSTACK...');
  
  // Cast text to existing enum so the update doesn't complain about enum types
  // Wait, if we are in Postgres, "SQUADCO" is already a valid enum variant in the DB before migration.
  // The Prisma query failed during migration because SQUADCO exists. So we just update to PAYSTACK.
  await client.query(`UPDATE orders SET "paymentMethod" = 'PAYSTACK' WHERE "paymentMethod"::text = 'SQUADCO'`);
  await client.query(`UPDATE wallet_transactions SET "source" = 'PAYSTACK' WHERE "source"::text = 'SQUADCO'`);
  
  console.log('Records updated successfully.');
  await client.end();
}

main().catch((e) => {
  console.error("Migration script failed:", e);
  process.exit(1);
});
