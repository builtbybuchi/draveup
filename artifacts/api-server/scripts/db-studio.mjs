#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");

const env = { ...process.env };

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  console.log("Loaded .env (overriding shell env for DATABASE_URL/DIRECT_URL).");
}

if (!env.DIRECT_URL && !env.DATABASE_URL) {
  console.error("DATABASE_URL or DIRECT_URL must be set.");
  process.exit(1);
}

console.log(`Opening Prisma Studio against: ${(env.DIRECT_URL ?? env.DATABASE_URL).split("@")[1]?.split("?")[0] ?? "(masked)"}`);

execSync("npx prisma studio", { cwd: root, stdio: "inherit", env });
