import { Router } from "express";
import { WalletTxnType, WalletTxnSource, WalletTxnStatus, DomainStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { loadUser, requireRole } from "../middlewares/requireRole.js";
import {
  getTldPrices, getDomainInfo,
  lockDomain, unlockDomain, setPrivacy, setNameservers, getContact, setContact,
  getDnsRecords, setDnsRecords, getAuthCode, deletePendingTransfer,
} from "../lib/dynadot.js";

const router = Router();

async function audit(req: any, action: string, target?: string, metadata?: any) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorClerkId: req.clerkUserId,
        actorEmail: req.userEmail || null,
        action,
        target: target || null,
        metadata: metadata || undefined,
      },
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}

// All admin endpoints require an authenticated admin OR customer service user.
router.use("/admin", loadUser);

// ─── ME (current admin user) ──────────────────────────────────────────────────
router.get("/admin/me", requireRole("ADMIN", "CUSTOMER_SERVICE"), (req, res) => {
  res.json({
    clerkId: req.clerkUserId,
    email: req.userEmail,
    role: req.userRole,
  });
});

// ─── TLDS ─────────────────────────────────────────────────────────────────────
router.get("/admin/tlds", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (_req, res) => {
  const tlds = await prisma.tld.findMany({ orderBy: { name: "asc" } });
  res.json(
    tlds.map((t: any) => ({
      ...t,
      costRegister: t.costRegister ? Number(t.costRegister) : null,
      costRenew: t.costRenew ? Number(t.costRenew) : null,
      costTransfer: t.costTransfer ? Number(t.costTransfer) : null,
      costRestore: t.costRestore ? Number(t.costRestore) : null,
      priceRegister: t.priceRegister ? Number(t.priceRegister) : null,
      priceRenew: t.priceRenew ? Number(t.priceRenew) : null,
      priceTransfer: t.priceTransfer ? Number(t.priceTransfer) : null,
      priceRestore: t.priceRestore ? Number(t.priceRestore) : null,
    })),
  );
});

/**
 * POST /api/admin/tlds/sync
 * Pulls all TLDs + wholesale prices from Dynadot, then syncs the DB:
 *   - Adds new TLDs
 *   - Updates wholesale costs on existing TLDs
 *   - Marks TLDs no longer in Dynadot as disabled
 * Does not overwrite admin-set retail prices.
 */
router.post("/admin/tlds/sync", requireRole("ADMIN"), async (req: any, res) => {
  try {
    const remote = await getTldPrices("USD");
    if (remote.length === 0) {
      return res.status(502).json({ error: "Dynadot returned no TLDs" });
    }

    const MARKUP = 6; // $6 markup on all prices
    const remoteByName = new Map(remote.map((r) => [r.tld.toLowerCase(), r]));
    const existing = await prisma.tld.findMany();
    const existingByName = new Map(existing.map((t: any) => [t.name.toLowerCase(), t]));

    let added = 0, updated = 0, removed = 0;
    const now = new Date();

    // upsert each remote TLD
    for (const r of remote) {
      const normalizedName = r.tld.toLowerCase();
      const ex = existingByName.get(normalizedName);
      const newCostRegister = r.registration ?? 0;
      const newCostRenew = r.renewal ?? 0;
      const newCostTransfer = r.transfer ?? 0;
      const newCostRestore = r.restore ?? 0;
      const newPriceRegister = newCostRegister + MARKUP;
      const newPriceRenew = newCostRenew + MARKUP;
      const newPriceTransfer = newCostTransfer + MARKUP;
      const newPriceRestore = newCostRestore + MARKUP;

      if (!ex) {
        await prisma.tld.create({
          data: {
            name: normalizedName,
            enabled: true,
            costRegister: newCostRegister as any,
            costRenew: newCostRenew as any,
            costTransfer: newCostTransfer as any,
            costRestore: newCostRestore as any,
            priceRegister: newPriceRegister as any,
            priceRenew: newPriceRenew as any,
            priceTransfer: newPriceTransfer as any,
            priceRestore: newPriceRestore as any,
            lastSyncedAt: now,
          },
        });
        added++;
      } else {
        const costChanged =
          Number(ex.costRegister || 0) !== newCostRegister ||
          Number(ex.costRenew || 0) !== newCostRenew ||
          Number(ex.costTransfer || 0) !== newCostTransfer ||
          Number(ex.costRestore || 0) !== newCostRestore;
        const priceNeedsUpdate =
          Number(ex.priceRegister || 0) !== newPriceRegister ||
          Number(ex.priceRenew || 0) !== newPriceRenew ||
          Number(ex.priceTransfer || 0) !== newPriceTransfer ||
          Number(ex.priceRestore || 0) !== newPriceRestore;
        const enabledChanged = ex.enabled === false;

        if (costChanged || priceNeedsUpdate || enabledChanged) {
          await prisma.tld.update({
            where: { id: ex.id },
            data: {
              enabled: true,
              costRegister: newCostRegister as any,
              costRenew: newCostRenew as any,
              costTransfer: newCostTransfer as any,
              costRestore: newCostRestore as any,
              priceRegister: newPriceRegister as any,
              priceRenew: newPriceRenew as any,
              priceTransfer: newPriceTransfer as any,
              priceRestore: newPriceRestore as any,
              lastSyncedAt: now,
            },
          });
          updated++;
        } else {
          await prisma.tld.update({ where: { id: ex.id }, data: { lastSyncedAt: now } });
        }
      }
    }

    // disable TLDs no longer in Dynadot
    for (const ex of existing) {
      if (!remoteByName.has((ex as any).name.toLowerCase()) && (ex as any).enabled) {
        await prisma.tld.update({ where: { id: (ex as any).id }, data: { enabled: false } });
        removed++;
      }
    }

    await audit(req, "tld.sync", null as any, { added, updated, removed, total: remote.length });
    res.json({ ok: true, added, updated, removed, total: remote.length });
  } catch (err: any) {
    console.error("TLD sync failed", err);
    res.status(500).json({
      error: err?.message || "TLD sync failed",
      code: err?.code || "TLD_SYNC_FAILED",
      source: "Dynadot",
    });
  }
});

/** PUT /api/admin/tlds/:tld — set retail prices and/or enabled flag. */
router.put("/admin/tlds/:tld", requireRole("ADMIN"), async (req: any, res) => {
  const { tld } = req.params;
  const { priceRegister, priceRenew, priceTransfer, priceRestore, enabled } = req.body || {};
  try {
    const updated = await prisma.tld.update({
      where: { name: String(tld).toLowerCase().replace(/^\./, "") },
      data: {
        ...(priceRegister !== undefined && { priceRegister: priceRegister as any }),
        ...(priceRenew !== undefined && { priceRenew: priceRenew as any }),
        ...(priceTransfer !== undefined && { priceTransfer: priceTransfer as any }),
        ...(priceRestore !== undefined && { priceRestore: priceRestore as any }),
        ...(enabled !== undefined && { enabled: !!enabled }),
      },
    });
    await audit(req, "tld.price.update", String(tld), { priceRegister, priceRenew, priceTransfer, priceRestore, enabled });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update TLD" });
  }
});

// ─── CURRENCIES ───────────────────────────────────────────────────────────────
router.get("/admin/currencies", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (_req, res) => {
  const list = await prisma.currency.findMany({ orderBy: { code: "asc" } });
  res.json(list.map((c: any) => ({ ...c, rate: Number(c.rate) })));
});

router.post("/admin/currencies", requireRole("ADMIN"), async (req: any, res) => {
  const { code, symbol, name, flag, rate, enabled } = req.body || {};
  if (!code || !symbol || !name) return res.status(400).json({ error: "code, symbol, name required" });
  try {
    const created = await prisma.currency.upsert({
      where: { code: String(code).toUpperCase() },
      update: {
        symbol,
        name,
        flag: flag || null,
        ...(rate !== undefined && { rate: rate as any }),
        ...(enabled !== undefined && { enabled: !!enabled }),
      },
      create: {
        code: String(code).toUpperCase(),
        symbol,
        name,
        flag: flag || null,
        rate: (rate ?? 1) as any,
        enabled: enabled !== false,
      },
    });
    await audit(req, "currency.upsert", created.code);
    res.json({ ...created, rate: Number(created.rate) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to save currency" });
  }
});

router.put("/admin/currencies/:code", requireRole("ADMIN"), async (req: any, res) => {
  const { code } = req.params;
  const { rate, symbol, name, flag, enabled } = req.body || {};
  try {
    const updated = await prisma.currency.update({
      where: { code: String(code).toUpperCase() },
      data: {
        ...(rate !== undefined && { rate: rate as any }),
        ...(symbol !== undefined && { symbol }),
        ...(name !== undefined && { name }),
        ...(flag !== undefined && { flag }),
        ...(enabled !== undefined && { enabled: !!enabled }),
      },
    });
    await audit(req, "currency.update", updated.code, { rate, enabled });
    res.json({ ...updated, rate: Number(updated.rate) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update currency" });
  }
});

router.delete("/admin/currencies/:code", requireRole("ADMIN"), async (req: any, res) => {
  const { code } = req.params;
  if (String(code).toUpperCase() === "USD") {
    return res.status(400).json({ error: "Cannot delete the base currency (USD)" });
  }
  try {
    await prisma.currency.delete({ where: { code: String(code).toUpperCase() } });
    await audit(req, "currency.delete", String(code).toUpperCase());
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete currency" });
  }
});

// ─── USERS (read-only for customer service) ───────────────────────────────────
router.get("/admin/users", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (req: any, res) => {
  const { q } = req.query;
  const where = q
    ? {
        OR: [
          { email: { contains: String(q), mode: "insensitive" as const } },
          { username: { contains: String(q), mode: "insensitive" as const } },
        ],
      }
    : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { domains: true, orders: true } } },
  });
  res.json(users);
});

// ─── DOMAINS (admin) ──────────────────────────────────────────────────────────

// GET /api/admin/domains?search=&cursor=&limit=
router.get("/admin/domains", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (req: any, res: any) => {
  const limit = Math.min(200, Number(req.query?.limit) || 50);
  const cursor = typeof req.query?.cursor === "string" ? req.query.cursor : undefined;
  const search = typeof req.query?.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query?.status === "string" ? req.query.status : undefined;
  const userId = typeof req.query?.userId === "string" ? req.query.userId : undefined;
  const where: any = {};
  if (search) where.domainName = { contains: search, mode: "insensitive" as const };
  if (status) where.status = status;
  if (userId) where.userId = userId;
  const [items, total] = await Promise.all([
    prisma.domain.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { expiresAt: "asc" },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
    prisma.domain.count({ where }),
  ]);
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  res.json({ items: page, nextCursor: hasMore ? page[page.length - 1]?.id : null, total });
});

// GET /api/admin/domains/:name — full domain detail + raw Dynadot info (ADMIN only)
router.get("/admin/domains/:name", requireRole("ADMIN"), async (req: any, res: any) => {
  const domainName = req.params.name;
  const [domain, dynadotInfo] = await Promise.allSettled([
    prisma.domain.findUnique({
      where: { domainName },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, registrantContact: true },
    }),
    getDomainInfo(domainName),
  ]);
  res.json({
    db: (domain.status === "fulfilled" ? domain.value : null),
    dynadot: (dynadotInfo.status === "fulfilled" ? dynadotInfo.value : { ok: false, message: String((dynadotInfo as any).reason) }),
  });
});

// POST /api/admin/domains/:name/action — perform a domain action on any domain (ADMIN only)
// body: { action: "lock"|"unlock"|"setPrivacy"|"setNameservers"|"setDns"|"deleteTransfer", ...params }
router.post("/admin/domains/:name/action", requireRole("ADMIN"), async (req: any, res: any) => {
  const domainName = req.params.name;
  const { action, ...params } = req.body ?? {};

  let result: any;
  switch (action) {
    case "lock":
      result = await lockDomain(domainName);
      if (result.ok) await prisma.domain.updateMany({ where: { domainName }, data: { locked: true } });
      break;
    case "unlock":
      result = await unlockDomain(domainName);
      if (result.ok) await prisma.domain.updateMany({ where: { domainName }, data: { locked: false } });
      break;
    case "setPrivacy": {
      const on = Boolean(params.on);
      result = await setPrivacy(domainName, on);
      if (result.ok) await prisma.domain.updateMany({ where: { domainName }, data: { privacyOn: on } });
      break;
    }
    case "setNameservers": {
      const ns: string[] = Array.isArray(params.nameservers) ? params.nameservers : [];
      if (ns.length < 2) return res.status(400).json({ error: "At least 2 nameservers required" });
      result = await setNameservers(domainName, ns);
      if (result.ok) await prisma.domain.updateMany({ where: { domainName }, data: { nameservers: ns } });
      break;
    }
    case "setDns": {
      const records = Array.isArray(params.records) ? params.records : [];
      if (!records.length) return res.status(400).json({ error: "records is required" });
      result = await setDnsRecords(domainName, records);
      break;
    }
    case "getDns":
      result = await getDnsRecords(domainName);
      break;
    case "getAuthCode":
      result = await getAuthCode(domainName);
      break;
    case "getContact": {
      const type = String(params.type || "registrant");
      result = await getContact(domainName, type);
      break;
    }
    case "setContact": {
      const type = String(params.type || "registrant");
      result = await setContact(domainName, type, params.contact);
      break;
    }
    case "deleteTransfer":
      result = await deletePendingTransfer(domainName);
      if (result.ok) await prisma.domain.updateMany({ where: { domainName }, data: { status: DomainStatus.CANCELLED } });
      break;
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  await audit(req, `domain.admin.${action}`, domainName, { params: { ...params }, result });
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  res.json({ ok: true, result: result.data });
});

// POST /api/admin/domains/:name/sync — pull fresh info from Dynadot
router.post("/admin/domains/:name/sync", requireRole("ADMIN"), async (req: any, res: any) => {
  const domainName = req.params.name;
  const result = await getDomainInfo(domainName);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  const info = result.data;
  const statusMap: Record<string, DomainStatus> = {
    active: DomainStatus.ACTIVE,
    expired: DomainStatus.EXPIRED,
    pending_transfer: DomainStatus.PENDING_TRANSFER,
    suspended: DomainStatus.SUSPENDED,
    cancelled: DomainStatus.CANCELLED,
  };
  const status = statusMap[info.status?.toLowerCase() ?? ""] ?? DomainStatus.ACTIVE;
  const updated = await prisma.domain.updateMany({
    where: { domainName },
    data: {
      status,
      ...(info.expiresAt ? { expiresAt: new Date(info.expiresAt) } : {}),
      ...(info.locked !== undefined ? { locked: info.locked } : {}),
      ...(info.privacyOn !== undefined ? { privacyOn: info.privacyOn } : {}),
      ...(info.autoRenew !== undefined ? { autoRenew: info.autoRenew } : {}),
      ...(info.nameservers.length ? { nameservers: info.nameservers } : {}),
      lastSyncedAt: new Date(),
    },
  });
  await audit(req, "domain.sync", domainName, { info });
  res.json({ ok: true, updated: updated.count, info });
});

// ─── TRANSFERS (admin) ────────────────────────────────────────────────────────
// GET /api/admin/transfers — in-progress (PENDING_TRANSFER) + recent (last 90 days DOMAIN_TRANSFER orders)
// Pending domains include all Dynadot-synced fields (status, locked, privacyOn, autoRenew, nameservers)
// which reflect Dynadot state as of lastSyncedAt.
router.get("/admin/transfers", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (_req, res: any) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const [pendingDomains, recentOrders] = await Promise.all([
    prisma.domain.findMany({
      where: { status: DomainStatus.PENDING_TRANSFER },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, domainName: true, tld: true, status: true,
        expiresAt: true, locked: true, privacyOn: true, autoRenew: true,
        nameservers: true, lastSyncedAt: true, createdAt: true, updatedAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        type: "DOMAIN_TRANSFER" as any,
        createdAt: { gte: ninetyDaysAgo },
        status: { in: ["PAID", "FULFILLED", "COMPLETED", "REFUNDED"] as any[] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
  ]);
  res.json({
    pending: pendingDomains,
    recentOrders: recentOrders.map((o: any) => ({
      ...o,
      amountUsd: Number(o.amountUsd),
      displayAmount: Number(o.displayAmount),
      ngnAmount: Number(o.ngnAmount),
    })),
  });
});

// ─── ORDERS (admin) ───────────────────────────────────────────────────────────

// GET /api/admin/orders?status=&type=&userId=&email=&dateFrom=&dateTo=&cursor=&limit=
router.get("/admin/orders", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (req: any, res: any) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const where: any = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.email) where.user = { email: { contains: String(req.query.email), mode: "insensitive" } };
  if (req.query.dateFrom || req.query.dateTo) {
    where.createdAt = {};
    if (req.query.dateFrom) where.createdAt.gte = new Date(String(req.query.dateFrom));
    if (req.query.dateTo) where.createdAt.lte = new Date(String(req.query.dateTo));
  }
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  res.json({
    items: page.map((o: any) => ({
      ...o,
      amountUsd: Number(o.amountUsd),
      displayAmount: Number(o.displayAmount),
      ngnAmount: Number(o.ngnAmount),
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id : null,
    total,
  });
});

// GET /api/admin/orders/:id
router.get("/admin/orders/:id", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (req: any, res: any) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      walletTxns: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({
    ...order,
    amountUsd: Number(order.amountUsd),
    displayAmount: Number(order.displayAmount),
    ngnAmount: Number(order.ngnAmount),
    walletTxns: order.walletTxns.map((t: any) => ({
      ...t,
      amountNgn: Number(t.amountNgn),
      balanceAfterNgn: Number(t.balanceAfterNgn),
    })),
  });
});

// POST /api/admin/orders/:id/fulfill
router.post("/admin/orders/:id/fulfill", requireRole("ADMIN"), async (req: any, res: any) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (["FULFILLED", "COMPLETED", "REFUNDED", "FAILED"].includes(order.status)) {
    return res.status(400).json({ error: `Cannot fulfil an order in ${order.status} status` });
  }
  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "FULFILLED" },
  });
  await audit(req, "order.fulfill", order.id, { prevStatus: order.status, description: order.description });
  res.json({ ok: true, order: { ...updated, amountUsd: Number(updated.amountUsd), ngnAmount: Number(updated.ngnAmount) } });
});

// POST /api/admin/orders/:id/refund
// body: { reason?: string, creditWallet?: boolean }
router.post("/admin/orders/:id/refund", requireRole("ADMIN"), async (req: any, res: any) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status === "REFUNDED") return res.status(400).json({ error: "Order already refunded" });

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "REFUNDED" },
  });

  // Optionally credit wallet if requested
  if (req.body?.creditWallet && Number(order.ngnAmount) > 0) {
    const creditAmt = Number(order.ngnAmount);
    const afterUser = await prisma.user.update({
      where: { id: order.userId },
      data: { walletBalanceNgn: { increment: creditAmt } },
    });
    const reference = `REF-${order.id}-${Date.now()}`;
    await prisma.walletTransaction.create({
      data: {
        userId: order.userId,
        type: "CREDIT",
        amountNgn: creditAmt,
        balanceAfterNgn: afterUser.walletBalanceNgn,
        source: "ADMIN",
        reference,
        status: "SUCCESS",
        description: `Refund for order ${order.id}: ${order.description}`,
      },
    });
  }

  const reason = String(req.body?.reason || "Admin refund");
  await audit(req, "order.refund", order.id, {
    prevStatus: order.status,
    reason,
    creditWallet: !!req.body?.creditWallet,
    ngnAmount: Number(order.ngnAmount),
  });
  res.json({ ok: true, order: { ...updated, amountUsd: Number(updated.amountUsd), ngnAmount: Number(updated.ngnAmount) } });
});

// ─── PER-USER WALLET CONVENIENCE ENDPOINTS ────────────────────────────────────

// GET /api/admin/users/:id/wallet — balance + recent transactions
router.get("/admin/users/:id/wallet", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (req: any, res: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, firstName: true, lastName: true, walletBalanceNgn: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  const txns = await prisma.walletTransaction.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({
    user: { ...user, walletBalanceNgn: Number(user.walletBalanceNgn) },
    transactions: txns.map((t: any) => ({ ...t, amountNgn: Number(t.amountNgn), balanceAfterNgn: Number(t.balanceAfterNgn) })),
  });
});

// POST /api/admin/users/:id/wallet/credit
router.post("/admin/users/:id/wallet/credit", requireRole("ADMIN"), async (req: any, res: any) => {
  const userId = req.params.id;
  const amountNgn = Number(req.body?.amountNgn);
  const description: string = String(req.body?.description ?? "Manual admin credit");
  if (!amountNgn || amountNgn <= 0) return res.status(400).json({ error: "amountNgn must be > 0" });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return res.status(404).json({ error: "User not found" });
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { walletBalanceNgn: { increment: amountNgn } },
  });
  const reference = `ADM-CREDIT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const txn = await prisma.walletTransaction.create({
    data: {
      userId,
      type: "CREDIT",
      amountNgn,
      balanceAfterNgn: updated.walletBalanceNgn,
      source: "ADMIN",
      reference,
      status: "SUCCESS",
      description,
    },
  });
  await audit(req, "wallet.adjust", target.email, { type: "CREDIT", amountNgn, description, reference });
  res.json({
    transaction: { ...txn, amountNgn: Number(txn.amountNgn), balanceAfterNgn: Number(txn.balanceAfterNgn) },
    newBalanceNgn: Number(updated.walletBalanceNgn),
  });
});

// POST /api/admin/users/:id/wallet/debit
router.post("/admin/users/:id/wallet/debit", requireRole("ADMIN"), async (req: any, res: any) => {
  const userId = req.params.id;
  const amountNgn = Number(req.body?.amountNgn);
  const description: string = String(req.body?.description ?? "Manual admin debit");
  if (!amountNgn || amountNgn <= 0) return res.status(400).json({ error: "amountNgn must be > 0" });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return res.status(404).json({ error: "User not found" });
  const result = await prisma.user.updateMany({
    where: { id: userId, walletBalanceNgn: { gte: amountNgn } },
    data: { walletBalanceNgn: { decrement: amountNgn } },
  });
  if (result.count === 0) return res.status(402).json({ error: "Insufficient balance" });
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const reference = `ADM-DEBIT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const txn = await prisma.walletTransaction.create({
    data: {
      userId,
      type: "DEBIT",
      amountNgn,
      balanceAfterNgn: updated.walletBalanceNgn,
      source: "ADMIN",
      reference,
      status: "SUCCESS",
      description,
    },
  });
  await audit(req, "wallet.adjust", target.email, { type: "DEBIT", amountNgn, description, reference });
  res.json({
    transaction: { ...txn, amountNgn: Number(txn.amountNgn), balanceAfterNgn: Number(txn.balanceAfterNgn) },
    newBalanceNgn: Number(updated.walletBalanceNgn),
  });
});

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
// GET /api/admin/audit?actor=&action=&dateFrom=&dateTo=&limit=&cursor=
router.get("/admin/audit", requireRole("ADMIN"), async (req: any, res: any) => {
  const limit = Math.min(500, Number(req.query.limit) || 200);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const where: any = {};
  if (req.query.actor) where.actorEmail = { contains: String(req.query.actor), mode: "insensitive" };
  if (req.query.action) where.action = { contains: String(req.query.action), mode: "insensitive" };
  if (req.query.target) where.target = { contains: String(req.query.target), mode: "insensitive" };
  if (req.query.dateFrom || req.query.dateTo) {
    where.createdAt = {};
    if (req.query.dateFrom) where.createdAt.gte = new Date(String(req.query.dateFrom));
    if (req.query.dateTo) where.createdAt.lte = new Date(String(req.query.dateTo));
  }
  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.adminAuditLog.count({ where }),
  ]);
  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;
  res.json({ items, nextCursor: hasMore ? items[items.length - 1]?.id : null, total });
});

// ─── WALLETS (admin) ──────────────────────────────────────────────────────────

// GET /api/admin/wallets — list users with wallet balances
router.get("/admin/wallets", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { walletBalanceNgn: "desc" },
    select: {
      id: true, clerkId: true, email: true, firstName: true, lastName: true,
      walletBalanceNgn: true, role: true, createdAt: true,
    },
    take: 200,
  });
  res.json(users.map((u: any) => ({ ...u, walletBalanceNgn: Number(u.walletBalanceNgn) })));
});

// GET /api/admin/wallets/:userId/transactions — paginated wallet txns for one user
router.get("/admin/wallets/:userId/transactions", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const rows = await prisma.walletTransaction.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, -1) : rows).map((t: any) => ({
    ...t,
    amountNgn: Number(t.amountNgn),
    balanceAfterNgn: Number(t.balanceAfterNgn),
  }));
  res.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
});

// GET /api/admin/wallet-transactions — global, paginated, all wallet txns.
// Filters: ?type, ?source, ?status, ?reference, ?email
router.get("/admin/wallet-transactions", requireRole("ADMIN", "CUSTOMER_SERVICE"), async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const where: any = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.source) where.source = req.query.source;
  if (req.query.status) where.status = req.query.status;
  if (req.query.reference) where.reference = { contains: String(req.query.reference) };
  if (req.query.email) where.user = { email: { contains: String(req.query.email), mode: "insensitive" } };

  const rows = await prisma.walletTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });
  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, -1) : rows).map((t: any) => ({
    ...t,
    amountNgn: Number(t.amountNgn),
    balanceAfterNgn: Number(t.balanceAfterNgn),
  }));
  res.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
});

// POST /api/admin/wallets/:userId/adjust — manual credit/debit (ADMIN only)
// body: { type: "CREDIT" | "DEBIT", amountNgn: number, description?: string }
router.post("/admin/wallets/:userId/adjust", requireRole("ADMIN"), async (req: any, res) => {
  const userId = req.params.userId;
  const type = req.body?.type === "DEBIT" ? "DEBIT" : req.body?.type === "CREDIT" ? "CREDIT" : null;
  const amountNgn = Number(req.body?.amountNgn);
  const description: string = String(req.body?.description ?? "Manual admin adjustment");

  if (!type) return res.status(400).json({ error: "type must be CREDIT or DEBIT" });
  if (!amountNgn || amountNgn <= 0) return res.status(400).json({ error: "amountNgn must be > 0" });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return res.status(404).json({ error: "User not found" });

  let updated;
  if (type === "DEBIT") {
    const result = await prisma.user.updateMany({
      where: { id: userId, walletBalanceNgn: { gte: amountNgn } },
      data: { walletBalanceNgn: { decrement: amountNgn } },
    });
    if (result.count === 0) return res.status(402).json({ error: "Insufficient balance" });
    updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  } else {
    updated = await prisma.user.update({
      where: { id: userId },
      data: { walletBalanceNgn: { increment: amountNgn } },
    });
  }

  const reference = `ADM-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const txn = await prisma.walletTransaction.create({
    data: {
      userId,
      type: type === "DEBIT" ? WalletTxnType.DEBIT : WalletTxnType.CREDIT,
      amountNgn,
      balanceAfterNgn: updated.walletBalanceNgn,
      source: WalletTxnSource.ADMIN,
      reference,
      status: WalletTxnStatus.SUCCESS,
      description,
    },
  });

  await audit(req, "wallet.adjust", target.email, { type, amountNgn, description, reference });

  res.json({
    transaction: { ...txn, amountNgn: Number(txn.amountNgn), balanceAfterNgn: Number(txn.balanceAfterNgn) },
    newBalanceNgn: Number(updated.walletBalanceNgn),
  });
});

export default router;
