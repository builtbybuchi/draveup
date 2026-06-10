#!/usr/bin/env node
/**
 * promote-admin — Promote a Clerk user to ADMIN or CUSTOMER_SERVICE.
 *
 * Usage:
 *   node scripts/promote-admin.mjs <email> <ADMIN|CUSTOMER_SERVICE|CUSTOMER>
 *
 * Sets the role both in Clerk (publicMetadata.role) and in the local DB.
 * Requires CLERK_SECRET_KEY in env.
 */
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClerkClient } from "@clerk/backend";

const [, , emailArg, roleArg = "ADMIN"] = process.argv;
if (!emailArg) {
  console.error("Usage: node scripts/promote-admin.mjs <email> <ADMIN|CUSTOMER_SERVICE|CUSTOMER>");
  process.exit(1);
}
const role = String(roleArg).toUpperCase();
if (!["ADMIN", "CUSTOMER_SERVICE", "CUSTOMER"].includes(role)) {
  console.error("Invalid role. Use ADMIN, CUSTOMER_SERVICE, or CUSTOMER.");
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY is not set. Add it to .env or shared env.");
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const url = process.env.DATABASE_URL;
const isAccelerate = url?.startsWith("prisma+") || url?.startsWith("prisma://");
const prisma = isAccelerate
  ? new PrismaClient({ accelerateUrl: url }).$extends(withAccelerate())
  : new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }).$extends(withAccelerate());

const list = await clerk.users.getUserList({ emailAddress: [emailArg] });
const user = list.data[0];
if (!user) {
  console.error(`No Clerk user found with email ${emailArg}`);
  process.exit(1);
}

await clerk.users.updateUserMetadata(user.id, {
  publicMetadata: { ...(user.publicMetadata || {}), role },
});

await prisma.user.upsert({
  where: { clerkId: user.id },
  update: { role },
  create: {
    clerkId: user.id,
    email: emailArg,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    role,
  },
});

console.log(`✅ ${emailArg} promoted to ${role}`);
await prisma.$disconnect();
