/**
 * Clerk Webhook Handler
 *
 * Clerk sends events to this endpoint when users are created, updated, or deleted.
 * This keeps our `users` table in sync with Clerk.
 *
 * Setup in Clerk Dashboard:
 *   1. Go to Webhooks → Add Endpoint
 *   2. URL: https://your-api-domain/api/webhooks/clerk
 *   3. Subscribe to: user.created, user.updated, user.deleted
 *   4. Copy the signing secret → set as CLERK_WEBHOOK_SECRET in .env
 */

import { Router } from "express";
import { Webhook } from "svix";
import { prisma } from "../lib/prisma.js";

const router = Router();

// SquadCo webhook is mounted in app.ts BEFORE express.json() so it can
// receive the raw body for HMAC-SHA512 signature verification. See
// routes/squadcoWebhook.ts.

// Raw body is needed to verify the webhook signature — mount before express.json()
router.post("/webhooks/clerk", async (req, res) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("CLERK_WEBHOOK_SECRET not set — skipping webhook verification");
    res.status(400).json({ error: "Webhook secret not configured" });
    return;
  }

  const svixId = req.headers["svix-id"] as string;
  const svixTimestamp = req.headers["svix-timestamp"] as string;
  const svixSignature = req.headers["svix-signature"] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing svix headers" });
    return;
  }

  const wh = new Webhook(secret);
  let evt: { type: string; data: Record<string, unknown> };

  try {
    const payload = JSON.stringify(req.body);
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof evt;
  } catch {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const { type, data } = evt;

  try {
    if (type === "user.created" || type === "user.updated") {
      const clerkId = data.id as string;
      const email = (data.email_addresses as { email_address: string; id: string }[])
        .find((e) => e.id === data.primary_email_address_id)?.email_address ?? "";

      await prisma.user.upsert({
        where: { clerkId },
        update: {
          email,
          username: (data.username as string) ?? null,
          firstName: (data.first_name as string) ?? null,
          lastName: (data.last_name as string) ?? null,
        },
        create: {
          clerkId,
          email,
          username: (data.username as string) ?? null,
          firstName: (data.first_name as string) ?? null,
          lastName: (data.last_name as string) ?? null,
        },
      });

      console.log(`[webhook] User ${type}: ${clerkId} (${email})`);
    }

    if (type === "user.deleted") {
      const clerkId = data.id as string;
      await prisma.user.delete({ where: { clerkId } }).catch(() => {
        // ignore if user doesn't exist in our DB
      });
      console.log(`[webhook] User deleted: ${clerkId}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[webhook] Error processing event:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
