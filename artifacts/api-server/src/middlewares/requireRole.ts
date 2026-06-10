import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { prisma } from "../lib/prisma.js";

export type Role = "CUSTOMER" | "CUSTOMER_SERVICE" | "ADMIN";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      clerkUserId?: string;
      userRole?: Role;
      userEmail?: string | null;
    }
  }
}

/**
 * Loads the current Clerk user, ensures a DB user record exists, and attaches
 * `req.userRole` + `req.clerkUserId` + `req.userEmail`.
 *
 * Role precedence:
 *   1) Clerk publicMetadata.role (allows promoting users from Clerk dashboard)
 *   2) DB user.role
 *   3) "CUSTOMER"
 */
export async function loadUser(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
    const metaRole = (clerkUser.publicMetadata as any)?.role as Role | undefined;

    const dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { ...(email && { email }) },
      create: {
        clerkId: userId,
        email,
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        username: clerkUser.username ?? undefined,
      },
    });

    const role: Role = metaRole && ["ADMIN", "CUSTOMER_SERVICE", "CUSTOMER"].includes(metaRole)
      ? metaRole
      : (dbUser.role as Role);

    // Sync DB role with Clerk metadata if they differ (Clerk wins)
    if (metaRole && dbUser.role !== metaRole) {
      await prisma.user.update({ where: { id: dbUser.id }, data: { role: metaRole as any } });
    }

    req.clerkUserId = userId;
    req.userRole = role;
    req.userEmail = email;
    next();
  } catch (err) {
    console.error("loadUser failed", err);
    return res.status(500).json({ error: "Failed to load user" });
  }
}

export function requireRole(...allowed: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) return res.status(401).json({ error: "Unauthorized" });
    if (!allowed.includes(req.userRole)) {
      return res.status(403).json({ error: "Forbidden — insufficient role" });
    }
    next();
  };
}
