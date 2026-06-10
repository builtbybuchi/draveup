#!/usr/bin/env node
/**
 * seed-currencies — Seeds the default supported currencies.
 * Safe to run multiple times (uses upsert).
 *
 * Default rates are placeholder approximations. Use the admin app to update.
 */
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
const isAccelerate = url?.startsWith("prisma+") || url?.startsWith("prisma://");
const prisma = isAccelerate
  ? new PrismaClient({ accelerateUrl: url }).$extends(withAccelerate())
  : new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }).$extends(withAccelerate());

const SEED = [
  { code: "USD", symbol: "$",   name: "US Dollar",         flag: "🇺🇸", rate: 1 },
  { code: "GBP", symbol: "£",   name: "British Pound",     flag: "🇬🇧", rate: 0.79 },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar", flag: "🇦🇺", rate: 1.52 },
  { code: "CNY", symbol: "¥",   name: "Chinese Yuan",      flag: "🇨🇳", rate: 7.23 },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi",     flag: "🇬🇭", rate: 13.20 },
  { code: "NGN", symbol: "₦",   name: "Nigerian Naira",    flag: "🇳🇬", rate: 1230.0 },
  { code: "EUR", symbol: "€",   name: "Euro",              flag: "🇪🇺", rate: 0.92 },
  { code: "CAD", symbol: "C$",  name: "Canadian Dollar",   flag: "🇨🇦", rate: 1.36 },
  { code: "INR", symbol: "₹",   name: "Indian Rupee",      flag: "🇮🇳", rate: 83.12 },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling",   flag: "🇰🇪", rate: 131.5 },
  { code: "ZAR", symbol: "R",   name: "South African Rand",flag: "🇿🇦", rate: 18.9 },
  { code: "EGP", symbol: "E£",  name: "Egyptian Pound",    flag: "🇪🇬", rate: 47.3 },
];

let added = 0, kept = 0;
for (const c of SEED) {
  const r = await prisma.currency.upsert({
    where: { code: c.code },
    update: {}, // do not overwrite admin-edited values
    create: c,
  });
  if (r.createdAt.getTime() === r.updatedAt.getTime()) added++;
  else kept++;
}
console.log(`✅ Currencies seeded — added ${added}, kept ${kept} existing.`);
await prisma.$disconnect();
