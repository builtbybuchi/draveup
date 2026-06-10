/**
 * Users API Routes
 *
 * GET  /api/users/me          — Get or create the current user's DB record
 * PATCH /api/users/me         — Update profile fields
 * GET  /api/users/me/domains  — List user's domains
 * GET  /api/users/me/emails   — List user's email subscriptions
 * GET  /api/users/me/orders   — List user's orders
 */

import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Middleware: require a valid Clerk session
function requireAuth(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
}

// GET /api/users/me — returns the user record, creates it if it doesn't exist yet
router.get("/users/me", requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.upsert({
      where: { clerkId: req.clerkUserId },
      update: {},
      create: { clerkId: req.clerkUserId, email: "" },
      include: {
        domains: { orderBy: { createdAt: "desc" } },
        emailSubscriptions: { orderBy: { createdAt: "desc" } },
      },
    });
    res.json(user);
  } catch (err) {
    console.error("GET /users/me error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/users/me — update username / names
router.patch("/users/me", requireAuth, async (req: any, res: any) => {
  const { username, firstName, lastName, imageFile } = req.body;

  if (username !== undefined) {
    return res.status(400).json({ error: "Username cannot be updated after account creation" });
  }

  try {
    // Update local database (if needed for firstName, lastName)
    const user = await prisma.user.update({
      where: { clerkId: req.clerkUserId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      },
    });

    // Sync profile to Clerk
    if (firstName !== undefined || lastName !== undefined) {
      await clerkClient.users.updateUser(req.clerkUserId, {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      });
    }

    if (imageFile) {
      const match = imageFile.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (match) {
        const fileContent = Buffer.from(match[2], 'base64');
        const file = new File([fileContent], 'profile-image.png', { type: `image/${match[1]}` });
        await clerkClient.users.updateUserProfileImage(req.clerkUserId, {
          file: file,
        });
      }
    }

    return res.json(user);
  } catch (err) {
    console.error("PATCH /users/me error:", err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

// GET /api/users/me/domains
router.get("/users/me/domains", requireAuth, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const domains = await prisma.domain.findMany({
      where: { userId: user.id },
      include: { emailSubscriptions: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(domains);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch domains" });
  }
});

// GET /api/users/me/emails
router.get("/users/me/emails", requireAuth, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const emails = await prisma.emailSubscription.findMany({
      where: { userId: user.id },
      include: { domain: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(emails);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch email subscriptions" });
  }
});

// GET /api/users/me/orders
router.get("/users/me/orders", requireAuth, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;
