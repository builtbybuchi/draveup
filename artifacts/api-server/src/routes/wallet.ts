/**
 * Wallet API — USD-first customer wallet.
 *
 * GET  /api/wallet/balance       — current user's USD balance
 * GET  /api/wallet/transactions  — current user's wallet transactions
 * POST /api/wallet/fund/init     — init a Paystack top-up; returns reference & amount
 * POST /api/wallet/verify/:ref   — manual verify in case the webhook is delayed
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { WalletTxnType, WalletTxnSource, WalletTxnStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyPaystackTransaction, paystackConfigured } from "../lib/paystack.js";
import crypto from "node:crypto";

const router: Router = Router();

interface AuthedRequest extends Request {
  clerkUserId?: string;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
}

async function loadDbUser(clerkId: string) {
  return prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: "" },
  });
}

router.get("/wallet/balance", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await loadDbUser(req.clerkUserId!);
  res.json({ balanceUsd: Number(u.walletBalanceUsd) });
});

router.get("/wallet/transactions", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await loadDbUser(req.clerkUserId!);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const rows = await prisma.walletTransaction.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, -1) : rows).map((t) => ({
    ...t,
    amountUsd: Number(t.amountUsd),
    balanceAfterUsd: Number(t.balanceAfterUsd),
  }));
  res.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
});

router.post("/wallet/fund/init", requireAuth, async (req: AuthedRequest, res: Response) => {
  if (!paystackConfigured()) {
    return res.status(503).json({ error: "Paystack not configured. Set PAYSTACK_SECRET_KEY in .env." });
  }
  const amountUsd = Number(req.body?.amountUsd);
  if (!amountUsd || amountUsd <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  const u = await loadDbUser(req.clerkUserId!);
  if (!u.email) return res.status(400).json({ error: "User has no email on file" });

  const reference = `DRV-WAL-${crypto.randomBytes(6).toString("hex")}`;

  await prisma.walletTransaction.create({
    data: {
      userId: u.id,
      type: WalletTxnType.CREDIT,
      amountUsd,
      balanceAfterUsd: u.walletBalanceUsd,
      source: WalletTxnSource.PAYSTACK,
      reference,
      status: WalletTxnStatus.PENDING,
      description: "Wallet top-up",
    },
  });

  res.json({ reference, email: u.email, amountUsd });
});

router.post("/wallet/verify/:ref", requireAuth, async (req: AuthedRequest, res: Response) => {
  const ref = req.params.ref;
  const u = await loadDbUser(req.clerkUserId!);
  const txn = await prisma.walletTransaction.findUnique({ where: { reference: ref } });
  if (!txn || txn.userId !== u.id) return res.status(404).json({ error: "Transaction not found" });
  if (txn.status === WalletTxnStatus.SUCCESS) {
    return res.json({ status: "SUCCESS", balanceUsd: Number(u.walletBalanceUsd) });
  }
  try {
    const v = await verifyPaystackTransaction(ref);
    if (!v.success) return res.json({ status: "PENDING" });
    const newBalance = await applySuccessfulTopUp(ref);
    return res.json({ status: "SUCCESS", balanceUsd: newBalance });
  } catch (e) {
    return res.status(502).json({ error: (e as Error)?.message ?? "verify failed" });
  }
});

/**
 * Idempotently credits a wallet for a successful top-up.
 * Returns the new balance in USD.
 */
export async function applySuccessfulTopUp(reference: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const txn = await tx.walletTransaction.findUnique({ where: { reference } });
    if (!txn) throw new Error(`No pending transaction for ref ${reference}`);
    if (txn.status === WalletTxnStatus.SUCCESS) {
      const u = await tx.user.findUniqueOrThrow({ where: { id: txn.userId } });
      return Number(u.walletBalanceUsd);
    }
    const amountUsd = Number(txn.amountUsd);
    
    const u = await tx.user.update({
      where: { id: txn.userId },
      data: { walletBalanceUsd: { increment: amountUsd } },
    });
    await tx.walletTransaction.update({
      where: { reference },
      data: {
        status: WalletTxnStatus.SUCCESS,
        balanceAfterUsd: u.walletBalanceUsd,
      },
    });
    return Number(u.walletBalanceUsd);
  });
}

export default router;
