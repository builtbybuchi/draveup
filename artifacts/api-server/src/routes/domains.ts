/**
 * Domain management routes.
 *
 * Public (search/WHOIS) — no auth required.
 * Customer — must be authenticated, can only operate on their own domains.
 * Admin — separate admin endpoints in routes/admin.ts.
 *
 * GET  /api/domains                    — list current user's domains
 * POST /api/domains/register           — register a new domain (requires paid order or admin override)
 * POST /api/domains/transfer           — initiate inbound transfer
 * GET  /api/domains/:name/transfer-status
 * POST /api/domains/:name/renew        — renew a domain
 * GET  /api/domains/:name/nameservers
 * PUT  /api/domains/:name/nameservers
 * GET  /api/domains/:name/contacts
 * PUT  /api/domains/:name/contacts
 * POST /api/domains/:name/lock
 * POST /api/domains/:name/unlock
 * GET  /api/domains/:name/auth-code
 * POST /api/domains/:name/privacy
 * POST /api/domains/sync               — pull fresh info for all user's domains from Dynadot
 * GET  /api/domains/search             — availability + pricing (public)
 * GET  /api/domains/whois              — WHOIS via RDAP (public)
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { DomainStatus, ContactType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  checkAvailability, whoisLookup,
  getDomainInfo, listAccountDomains,
  registerDomain, renewDomain, transferDomain, getTransferStatus, deletePendingTransfer,
  getNameservers, setNameservers,
  getContact, setContact,
  lockDomain, unlockDomain,
  getAuthCode, setPrivacy,
  getDnsRecords, setDnsRecords,
  type ContactData,
} from "../lib/dynadot.js";

const router = Router();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

interface AuthedRequest extends Request { clerkUserId?: string }

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
}

async function getDbUser(clerkId: string) {
  return prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: "" },
  });
}

async function getUserDomain(userId: string, domainName: string) {
  const d = await prisma.domain.findUnique({ where: { domainName } });
  if (!d || d.userId !== userId) return null;
  return d;
}

/**
 * Find a PAID order that entitles the user to act on the given domain.
 * Checks metadata.items[].name and metadata.items[].metadata?.domain for an
 * exact case-insensitive match — never a substring search.
 */
async function findPaidDomainOrder(
  userId: string,
  domainName: string,
  type: "DOMAIN_REGISTRATION" | "DOMAIN_RENEWAL" | "DOMAIN_TRANSFER" | "DOMAIN_RESTORE",
) {
  const candidates = await prisma.order.findMany({
    where: { userId, type, status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const needle = domainName.toLowerCase();
  return candidates.find((o) => {
    const meta = (o.metadata as Record<string, any>) ?? {};
    const items: any[] = Array.isArray(meta.items) ? meta.items : [];
    return items.some(
      (item) =>
        String(item?.name ?? "").toLowerCase() === needle ||
        String(item?.metadata?.domain ?? "").toLowerCase() === needle ||
        String(item?.domain ?? "").toLowerCase() === needle,
    );
  }) ?? null;
}

function extractTld(domainName: string): string {
  const idx = domainName.lastIndexOf(".");
  return idx < 0 ? "" : domainName.slice(idx + 1).toLowerCase();
}

function parseDomainAndTld(input: string): { sld: string; tld?: string } {
  const clean = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*/, "");
  const dot = clean.indexOf(".");
  if (dot === -1) return { sld: clean };
  return { sld: clean.slice(0, dot), tld: clean.slice(dot + 1) };
}

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

router.get("/domains/search", async (req: any, res: any) => {
  const { query, tlds } = req.query;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query parameter is required" });
  }
  
  const { sld, tld: queriedTld } = parseDomainAndTld(query);
  if (!sld) {
    return res.status(400).json({ error: "Invalid query" });
  }
  
  // Determine which TLDs to search
  let tldList: string[];
  if (typeof tlds === "string" && tlds.trim()) {
    tldList = tlds
      .split(",")
      .map((t) => t.trim().replace(/^\./, ""))
      .filter(Boolean);
  } else if (queriedTld) {
    tldList = [queriedTld];
  } else {
    // Default to popular TLDs
    tldList = ["com", "net", "org", "io", "co", "ai"];
  }
  
  const domains = tldList.map((t) => `${sld}.${t}`);
  
  try {
    // Get availability from Dynadot and pricing from our DB
    const [availability, dbTlds] = await Promise.all([
      checkAvailability(domains, { showPrice: true, currency: "USD" }),
      prisma.tld.findMany({ where: { name: { in: tldList } } }),
    ]);
    
    // Build price lookup map from DB
    const priceByTld = new Map(
      dbTlds.map((t: any) => [
        t.name,
        {
          register: t.priceRegister ? Number(t.priceRegister) : null,
          renew: t.priceRenew ? Number(t.priceRenew) : null,
        },
      ])
    );
    
    const results = availability.map((a) => {
      const domainParts = a.domain.split(".");
      const t = domainParts.slice(1).join(".");
      const dbPrices = priceByTld.get(t);
      
      return {
        domain: a.domain,
        tld: t,
        available: a.available,
        // Always use DB pricing (not Dynadot pricing)
        priceUsd: dbPrices?.register ?? null,
        renewUsd: dbPrices?.renew ?? null,
      };
    });
    
    res.json({ results });
  } catch (e) {
    console.error("Domain search error:", e);
    res.status(500).json({ error: "Failed to search domain availability" });
  }
});

router.get("/domains/whois", async (req: any, res: any) => {
  const { domain } = req.query;
  if (!domain || typeof domain !== "string") return res.status(400).json({ error: "Domain parameter is required" });
  try {
    res.json(await whoisLookup(domain));
  } catch (e) {
    res.status(500).json({ error: "WHOIS lookup failed" });
  }
});

// ─── AUTHENTICATED ROUTES ─────────────────────────────────────────────────────

// GET /api/domains — list user's domains
router.get("/domains", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const domains = await prisma.domain.findMany({
    where: { userId: u.id },
    include: { registrantContact: true },
    orderBy: { expiresAt: "asc" },
  });
  res.json(domains);
});

// POST /api/domains/register — register a new domain
// body: { domain, years?, nameservers?, privacy? }
// NOTE: only available if a PAID DOMAIN_REGISTRATION order exists for this domain
router.post("/domains/register", requireAuth, async (req: AuthedRequest, res: Response) => {
  const domainName = String(req.body?.domain || "").toLowerCase().trim();
  const years = Math.max(1, Math.min(10, Number(req.body?.years) || 1));
  const ns: string[] = Array.isArray(req.body?.nameservers) ? req.body.nameservers : [];
  const privacy = Boolean(req.body?.privacy);
  if (!domainName) return res.status(400).json({ error: "domain is required" });

  const u = await getDbUser(req.clerkUserId!);

  // Verify a paid order exists for this exact domain (exact metadata match, no substring search)
  const order = await findPaidDomainOrder(u.id, domainName, "DOMAIN_REGISTRATION");
  if (!order) return res.status(403).json({ error: "No paid order found for this domain registration" });

  const result = await registerDomain({ domain: domainName, years, nameservers: ns.length ? ns : undefined, privacy });
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });

  const tld = extractTld(domainName);
  const expiresAt = new Date(result.data.expiresAt);
  const domain = await prisma.domain.upsert({
    where: { domainName },
    create: {
      userId: u.id,
      domainName,
      tld,
      status: DomainStatus.ACTIVE,
      registeredAt: new Date(),
      expiresAt,
      autoRenew: true,
      locked: true,
      privacyOn: privacy,
      nameservers: ns.length ? ns : ["ns1.dynadot.com", "ns2.dynadot.com"],
      lastSyncedAt: new Date(),
    },
    update: {
      userId: u.id,   // reassign ownership on re-registration
      status: DomainStatus.ACTIVE,
      expiresAt,
      privacyOn: privacy,
      nameservers: ns.length ? ns : undefined,
      lastSyncedAt: new Date(),
    },
  });

  await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
  res.json({ ok: true, domain });
});

// POST /api/domains/transfer — initiate inbound transfer
// body: { domain, authCode, years? }
router.post("/domains/transfer", requireAuth, async (req: AuthedRequest, res: Response) => {
  const domainName = String(req.body?.domain || "").toLowerCase().trim();
  const authCode = String(req.body?.authCode || "").trim();
  if (!domainName || !authCode) return res.status(400).json({ error: "domain and authCode are required" });

  const u = await getDbUser(req.clerkUserId!);
  const order = await findPaidDomainOrder(u.id, domainName, "DOMAIN_TRANSFER");
  if (!order) return res.status(403).json({ error: "No paid transfer order found for this domain" });

  const result = await transferDomain(domainName, authCode);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });

  const tld = extractTld(domainName);
  const domain = await prisma.domain.upsert({
    where: { domainName },
    create: {
      userId: u.id,
      domainName,
      tld,
      status: DomainStatus.PENDING_TRANSFER,
      registeredAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 86400_000),
      lastSyncedAt: new Date(),
    },
    update: {
      userId: u.id,  // reassign ownership on incoming transfer to new user
      status: DomainStatus.PENDING_TRANSFER,
      lastSyncedAt: new Date(),
    },
  });

  await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
  res.json({ ok: true, domain, transferId: result.data.transferId });
});

// GET /api/domains/:name/transfer-status
router.get("/domains/:name/transfer-status", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await getTransferStatus(req.params.name);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  res.json({ ok: true, ...result.data });
});

// POST /api/domains/:name/renew — renew a domain
// body: { years? }
router.post("/domains/:name/renew", requireAuth, async (req: AuthedRequest, res: Response) => {
  const years = Math.max(1, Math.min(10, Number(req.body?.years) || 1));
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });

  const order = await findPaidDomainOrder(u.id, req.params.name, "DOMAIN_RENEWAL");
  if (!order) return res.status(403).json({ error: "No paid renewal order found for this domain" });

  const result = await renewDomain(req.params.name, years);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });

  const updated = await prisma.domain.update({
    where: { domainName: req.params.name },
    data: { expiresAt: new Date(result.data.expiresAt), lastSyncedAt: new Date() },
  });
  await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
  res.json({ ok: true, domain: updated });
});

// GET /api/domains/:name/nameservers
router.get("/domains/:name/nameservers", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await getNameservers(req.params.name);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  // Sync to DB
  await prisma.domain.update({ where: { domainName: req.params.name }, data: { nameservers: result.data.nameservers, lastSyncedAt: new Date() } });
  res.json({ ok: true, nameservers: result.data.nameservers });
});

// PUT /api/domains/:name/nameservers — body: { nameservers: string[] }
router.put("/domains/:name/nameservers", requireAuth, async (req: AuthedRequest, res: Response) => {
  const nameservers: string[] = Array.isArray(req.body?.nameservers) ? req.body.nameservers.map(String) : [];
  if (nameservers.length < 2) return res.status(400).json({ error: "At least 2 nameservers required" });
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await setNameservers(req.params.name, nameservers);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  await prisma.domain.update({ where: { domainName: req.params.name }, data: { nameservers, lastSyncedAt: new Date() } });
  res.json({ ok: true, nameservers });
});

// GET /api/domains/:name/contacts?type=registrant
router.get("/domains/:name/contacts", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const contactType = String(req.query?.type || "registrant");
  const result = await getContact(req.params.name, contactType);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  res.json({ ok: true, contact: result.data.contact, contactType });
});

// PUT /api/domains/:name/contacts — body: { type, contact: ContactData }
router.put("/domains/:name/contacts", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const contactType = String(req.body?.type || "registrant");
  const contact: ContactData = req.body?.contact;
  if (!contact?.email || !contact?.firstName) return res.status(400).json({ error: "contact.email and contact.firstName are required" });
  const result = await setContact(req.params.name, contactType, contact);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });

  // Mirror to Contact table
  const ctMap: Record<string, ContactType> = {
    registrant: ContactType.REGISTRANT,
    admin: ContactType.ADMIN,
    tech: ContactType.TECH,
    billing: ContactType.BILLING,
  };
  const ct = ctMap[contactType] ?? ContactType.REGISTRANT;
  const saved = await prisma.contact.create({
    data: {
      userId: u.id,
      type: ct,
      firstName: contact.firstName,
      lastName: contact.lastName,
      organization: contact.organization,
      email: contact.email,
      phone: contact.phone,
      address1: contact.address1,
      address2: contact.address2,
      city: contact.city,
      state: contact.state,
      postalCode: contact.postalCode,
      country: contact.country,
    },
  });
  if (ct === ContactType.REGISTRANT) {
    await prisma.domain.update({ where: { domainName: req.params.name }, data: { registrantContactId: saved.id } });
  }
  res.json({ ok: true, contact: saved });
});

// POST /api/domains/:name/lock
router.post("/domains/:name/lock", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await lockDomain(req.params.name);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  await prisma.domain.update({ where: { domainName: req.params.name }, data: { locked: true } });
  res.json({ ok: true, locked: true });
});

// POST /api/domains/:name/unlock
router.post("/domains/:name/unlock", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await unlockDomain(req.params.name);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  await prisma.domain.update({ where: { domainName: req.params.name }, data: { locked: false } });
  res.json({ ok: true, locked: false });
});

// GET /api/domains/:name/auth-code
router.get("/domains/:name/auth-code", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await getAuthCode(req.params.name);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  res.json({ ok: true, authCode: result.data.authCode });
});

// POST /api/domains/:name/privacy — body: { on: boolean }
router.post("/domains/:name/privacy", requireAuth, async (req: AuthedRequest, res: Response) => {
  const on = Boolean(req.body?.on);
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await setPrivacy(req.params.name, on);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  await prisma.domain.update({ where: { domainName: req.params.name }, data: { privacyOn: on } });
  res.json({ ok: true, privacyOn: on });
});

// GET /api/domains/:name/dns
router.get("/domains/:name/dns", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await getDnsRecords(req.params.name);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  res.json({ ok: true, records: result.data.records });
});

// PUT /api/domains/:name/dns — body: { records: DnsRecord[] }
router.put("/domains/:name/dns", requireAuth, async (req: AuthedRequest, res: Response) => {
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  if (!records.length) return res.status(400).json({ error: "records array is required and must not be empty" });
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await setDnsRecords(req.params.name, records);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  res.json({ ok: true, records });
});

// DELETE /api/domains/:name/transfer — cancel a pending inbound transfer
router.delete("/domains/:name/transfer", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  if (d.status !== DomainStatus.PENDING_TRANSFER) {
    return res.status(400).json({ error: "Domain is not in PENDING_TRANSFER status" });
  }
  const result = await deletePendingTransfer(req.params.name);
  if (!result.ok) return res.status(502).json({ ok: false, code: result.code, message: result.message });
  await prisma.domain.update({
    where: { domainName: req.params.name },
    data: { status: DomainStatus.CANCELLED, lastSyncedAt: new Date() },
  });
  res.json({ ok: true, message: "Pending transfer cancelled" });
});

// POST /api/domains/sync — pull the full Dynadot account domain list and update
// rows that already belong to this user in our DB. Never creates new rows.
router.post("/domains/sync", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);

  // 1. Fetch account-wide domain list from Dynadot
  const listResult = await listAccountDomains(true);
  if (!listResult.ok) return res.status(502).json({ ok: false, code: listResult.code, message: listResult.message });

  // 2. Get the set of domain names already owned by this user in our DB
  const userDomains = await prisma.domain.findMany({ where: { userId: u.id }, select: { domainName: true } });
  const ownedSet = new Set(userDomains.map((d) => d.domainName));

  const statusMap: Record<string, DomainStatus> = {
    active: DomainStatus.ACTIVE,
    expired: DomainStatus.EXPIRED,
    pending_transfer: DomainStatus.PENDING_TRANSFER,
    suspended: DomainStatus.SUSPENDED,
    cancelled: DomainStatus.CANCELLED,
  };

  const synced: string[] = [];
  const skipped: string[] = [];

  await Promise.allSettled(listResult.data.map(async (ad) => {
    if (!ad.domain) return;
    // SECURITY: only update rows already owned by this user; ignore domains not in our DB
    if (!ownedSet.has(ad.domain)) { skipped.push(ad.domain); return; }

    // Call getDomainInfo per domain to get full detail including nameservers
    const infoResult = await getDomainInfo(ad.domain);
    if (infoResult.ok) {
      const info = infoResult.data;
      const status = statusMap[info.status?.toLowerCase() ?? ""] ?? (statusMap[ad.status?.toLowerCase() ?? ""] ?? DomainStatus.ACTIVE);
      await prisma.domain.update({
        where: { domainName: ad.domain },
        data: {
          status,
          ...(info.expiresAt ? { expiresAt: new Date(info.expiresAt) } : ad.expiresAt ? { expiresAt: new Date(ad.expiresAt) } : {}),
          ...(info.locked !== undefined ? { locked: info.locked } : ad.locked !== undefined ? { locked: ad.locked } : {}),
          ...(info.autoRenew !== undefined ? { autoRenew: info.autoRenew } : ad.autoRenew !== undefined ? { autoRenew: ad.autoRenew } : {}),
          ...(info.privacyOn !== undefined ? { privacyOn: info.privacyOn } : {}),
          ...(info.nameservers.length ? { nameservers: info.nameservers } : {}),
          lastSyncedAt: new Date(),
        },
      });
    } else {
      // getDomainInfo failed — fall back to list_domain data (no nameservers)
      const status = statusMap[ad.status?.toLowerCase() ?? ""] ?? DomainStatus.ACTIVE;
      const expiresAt = ad.expiresAt ? new Date(ad.expiresAt) : undefined;
      await prisma.domain.update({
        where: { domainName: ad.domain },
        data: {
          status,
          ...(expiresAt ? { expiresAt } : {}),
          ...(ad.locked !== undefined ? { locked: ad.locked } : {}),
          ...(ad.autoRenew !== undefined ? { autoRenew: ad.autoRenew } : {}),
          lastSyncedAt: new Date(),
        },
      });
    }
    synced.push(ad.domain);
  }));

  res.json({ ok: true, synced, count: synced.length, skipped: skipped.length });
});

// POST /api/domains/:name/sync — sync a single domain from Dynadot
router.post("/domains/:name/sync", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const d = await getUserDomain(u.id, req.params.name);
  if (!d) return res.status(404).json({ error: "Domain not found" });
  const result = await getDomainInfo(req.params.name);
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
  const updated = await prisma.domain.update({
    where: { domainName: req.params.name },
    data: {
      status,
      expiresAt: info.expiresAt ? new Date(info.expiresAt) : undefined,
      locked: info.locked ?? undefined,
      privacyOn: info.privacyOn ?? undefined,
      autoRenew: info.autoRenew ?? undefined,
      nameservers: info.nameservers.length ? info.nameservers : undefined,
      lastSyncedAt: new Date(),
    },
  });
  res.json({ ok: true, domain: updated });
});

export default router;
