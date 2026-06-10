#!/usr/bin/env node
/**
 * db-sync — Drave Registry database sync script
 *
 * Reads the Prisma schema and pushes all changes to the database.
 * - Creates tables that don't exist yet
 * - Adds new columns / alters types
 * - DROPS columns and tables removed from the schema (--accept-data-loss)
 *
 * Usage:
 *   pnpm --filter @workspace/api-server db:sync        # sync with confirmation on data loss
 *   pnpm --filter @workspace/api-server db:sync --force # sync and accept all data loss silently
 *   pnpm --filter @workspace/api-server db:migrate      # generate & apply a versioned migration
 *   pnpm --filter @workspace/api-server db:studio       # open Prisma Studio visual editor
 *
 * Requirements:
 *   DIRECT_URL must be set in .env (the raw postgres:// connection string).
 *   prisma db push uses DIRECT_URL via the directUrl field in schema.prisma.
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const env = { ...process.env };
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
} else {
  console.warn("⚠️  No .env file found. Make sure DATABASE_URL and DIRECT_URL are set.");
}

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", cwd: root, env, ...opts });
}

const args = process.argv.slice(2);
const force = args.includes("--force");

console.log("🔄  Drave Registry — Database Sync");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Schema:  prisma/schema.prisma");
console.log("Mode:    db push" + (force ? " --accept-data-loss (forced)" : " (safe)"));
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

try {
  // Generate Prisma client first so TypeScript types are up to date
  run("npx prisma generate");

  // Push schema to database
  // --accept-data-loss: allows dropping columns/tables removed from schema
  // Without this flag, Prisma will ask for confirmation on destructive changes
  if (force) {
    run("npx prisma db push --accept-data-loss");
  } else {
    run("npx prisma db push");
  }

  console.log("\n✅  Database sync complete!\n");
  console.log("Next steps:");
  console.log("  • Run  pnpm --filter @workspace/api-server db:studio  to browse your data");
  console.log("  • Run  pnpm --filter @workspace/api-server db:sync --force  to also drop removed columns\n");
} catch (err) {
  console.error("\n❌  Sync failed:", err.message);
  console.error("\nCommon fixes:");
  console.error("  • Check that DIRECT_URL is set correctly in artifacts/api-server/.env");
  console.error("  • Ensure your database is reachable and credentials are correct");
  console.error("  • For Prisma Accelerate: DIRECT_URL should be the raw postgres:// URL\n");
  process.exit(1);
}
