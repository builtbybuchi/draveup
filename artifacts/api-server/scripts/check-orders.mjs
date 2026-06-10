import pg from 'pg';
const { Client } = pg;

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    console.error("DIRECT_URL not found");
    process.exit(1);
  }
  const client = new Client({ connectionString });
  await client.connect();

  const res = await client.query('SELECT * FROM orders ORDER BY "createdAt" DESC LIMIT 5');
  console.log("LAST 5 ORDERS:");
  for (const row of res.rows) {
    console.log(`Order ${row.id} - Status: ${row.status}`);
    console.log(`Metadata:`, JSON.stringify(row.metadata, null, 2));
    console.log('---');
  }

  await client.end();
}

main().catch(console.error);
