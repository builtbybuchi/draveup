/**
 * Orders & checkout — USD settlement, wallet OR Paystack Inline.
 *
 * POST /api/orders             — create an order; body: { items, paymentMethod, displayCurrency, callbackUrl }
 *                                items[*]: { type, domain?, planKey?, years?, quantity? }
 *                                NOTE: the server NEVER trusts client prices.
 * GET  /api/orders/:id         — fetch one
 * GET  /api/orders             — list current user's orders (paginated: ?cursor, ?limit)
 * POST /api/orders/:id/verify  — verify a Paystack order on return
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { OrderType, PaymentMethod, OrderStatus, WalletTxnType, WalletTxnSource, WalletTxnStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyPaystackTransaction, paystackConfigured } from "../lib/paystack.js";
import { usdToDisplay } from "../lib/pricing.js";
import { fulfillOrder } from "../lib/fulfillment.js";
import { priceItems, type ClientItemSpec, type PricedLine } from "../lib/catalog.js";
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

function parseClientItems(raw: unknown): ClientItemSpec[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ClientItemSpec[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const it = r as Record<string, unknown>;
    out.push({
      type: String(it.type ?? "") as keyof typeof OrderType,
      domain: it.domain ? String(it.domain) : undefined,
      planKey: it.planKey ? String(it.planKey) : undefined,
      years: it.years != null ? Number(it.years) : undefined,
      quantity: it.quantity != null ? Number(it.quantity) : undefined,
      authCode: it.authCode ? String(it.authCode) : undefined,
    });
  }
  return out;
}

router.post("/orders", requireAuth, async (req: AuthedRequest, res: Response) => {
  const specs = parseClientItems(req.body?.items);
  if (!specs) return res.status(400).json({ error: "Invalid or empty items" });

  let priced: PricedLine[];
  try {
    priced = await priceItems(specs);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }

  const paymentMethodStr = String(req.body?.paymentMethod).toUpperCase();
  let paymentMethod: PaymentMethod = PaymentMethod.PAYSTACK;
  if (paymentMethodStr === "WALLET") paymentMethod = PaymentMethod.WALLET;
  if (paymentMethodStr === "LEMON_SQUEEZY") paymentMethod = PaymentMethod.LEMON_SQUEEZY;
  if (paymentMethodStr === "PAYHIP") paymentMethod = PaymentMethod.PAYHIP;
  
  const displayCurrency: string = String(req.body?.displayCurrency ?? "USD").toUpperCase();

  const u = await prisma.user.upsert({
    where: { clerkId: req.clerkUserId! },
    update: {},
    create: { clerkId: req.clerkUserId!, email: "" },
  });

  const totalUsd = +priced.reduce((s, it) => s + it.subtotalUsd, 0).toFixed(2);
  const display = await usdToDisplay(totalUsd, displayCurrency);

  const orderType: OrderType = priced.length === 1 ? priced[0].type : OrderType.DOMAIN_REGISTRATION;
  const description = priced.map((it) => `${it.name} (${it.type})`).join("; ");
  const reference = `DRV-ORD-${crypto.randomBytes(6).toString("hex")}`;

  const order = await prisma.order.create({
    data: {
      userId: u.id,
      type: orderType,
      description,
      amountUsd: totalUsd,
      currency: displayCurrency,
      displayCurrency,
      displayAmount: display.amount,
      settledAmount: totalUsd,
      paymentMethod,
      paymentRef: reference,
      status: OrderStatus.PENDING,
      metadata: { items: priced } as unknown as Prisma.InputJsonValue,
    },
  });

  if (paymentMethod === PaymentMethod.WALLET) {
    // Atomic conditional debit
    const debited = await prisma.user.updateMany({
      where: { id: u.id, walletBalanceUsd: { gte: totalUsd } },
      data: { walletBalanceUsd: { decrement: totalUsd } },
    });
    if (debited.count === 0) {
      await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.FAILED } });
      return res.status(402).json({ error: "Insufficient wallet balance", required: totalUsd });
    }
    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    await prisma.walletTransaction.create({
      data: {
        userId: u.id,
        type: WalletTxnType.DEBIT,
        amountUsd: totalUsd,
        balanceAfterUsd: updatedUser.walletBalanceUsd,
        source: WalletTxnSource.ORDER,
        reference: `${reference}-WAL`,
        status: WalletTxnStatus.SUCCESS,
        description: `Order ${reference}`,
        orderId: order.id,
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID } });
    await fulfillOrder(order.id);
    return res.json({
      orderId: order.id,
      reference,
      paymentMethod: "WALLET",
      walletDebited: true,
      newBalanceUsd: Number(updatedUser.walletBalanceUsd),
      displayAmount: display.amount,
      displaySymbol: display.symbol,
      amountUsd: totalUsd,
    });
  }

  // PAYSTACK Inline
  if (paymentMethod === PaymentMethod.PAYSTACK) {
    if (!paystackConfigured()) {
      return res.status(503).json({ error: "Paystack not configured. Set PAYSTACK_SECRET_KEY in .env." });
    }
    if (!u.email) return res.status(400).json({ error: "User has no email on file" });
    
    // We just return the reference and amount for frontend to initiate Paystack Inline
    return res.json({
      orderId: order.id,
      reference,
      paymentMethod: "PAYSTACK",
      displayAmount: display.amount,
      displaySymbol: display.symbol,
      amountUsd: totalUsd,
      email: u.email
    });
  }

  // Fallback for LEMON_SQUEEZY, PAYHIP
  return res.json({
      orderId: order.id,
      reference,
      paymentMethod,
      displayAmount: display.amount,
      displaySymbol: display.symbol,
      amountUsd: totalUsd,
      email: u.email
  });
});

// GET /api/orders — paginated history (cursor by createdAt id).
router.get("/orders", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId! } });
  if (!u) return res.json({ items: [], nextCursor: null });
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const orders = await prisma.order.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = orders.length > limit;
  const items = (hasMore ? orders.slice(0, -1) : orders).map((o) => ({
    ...o,
    amountUsd: Number(o.amountUsd),
    displayAmount: Number(o.displayAmount),
    settledAmount: Number(o.settledAmount),
  }));
  res.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
});

router.get("/orders/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId! } });
  if (!u) return res.status(404).json({ error: "User not found" });
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== u.id) return res.status(404).json({ error: "Order not found" });
  res.json({
    ...order,
    amountUsd: Number(order.amountUsd),
    displayAmount: Number(order.displayAmount),
    settledAmount: Number(order.settledAmount),
  });
});

router.post("/orders/:id/verify", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId! } });
  if (!u) return res.status(404).json({ error: "User not found" });
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== u.id) return res.status(404).json({ error: "Order not found" });
  if (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) {
    return res.json({ status: order.status });
  }
  if (order.paymentMethod !== PaymentMethod.PAYSTACK || !order.paymentRef) {
    return res.status(400).json({ error: "Order is not a Paystack order" });
  }
  try {
    const v = await verifyPaystackTransaction(order.paymentRef);
    if (!v.success) return res.json({ status: "PENDING" });
    await applySuccessfulOrder(order.paymentRef);
    return res.json({ status: "PAID" });
  } catch (e) {
    return res.status(502).json({ error: (e as Error)?.message ?? "verify failed" });
  }
});

/**
 * Idempotently mark an order as PAID and trigger fulfilment.
 */
export async function applySuccessfulOrder(reference: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { paymentRef: reference } });
  if (!order) throw new Error(`No order for ref ${reference}`);
  if (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) return;
  
  await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID } });
  await fulfillOrder(order.id);
}

export default router;
