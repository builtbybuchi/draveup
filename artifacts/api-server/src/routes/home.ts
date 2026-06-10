import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/home/stats — public
 * Returns lightweight rollups for the marketing home page.
 */
router.get("/home/stats", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        type: "DOMAIN_REGISTRATION",
        status: { in: ["PAID", "FULFILLED", "COMPLETED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { metadata: true },
    });

    const domainCounts = new Map<string, number>();
    const tldCounts = new Map<string, number>();

    for (const o of orders) {
      const meta = (o.metadata as any) ?? {};
      const items = Array.isArray(meta.items) ? meta.items : [];
      for (const it of items) {
        const domain = String(it?.metadata?.domain ?? it?.domain ?? it?.name ?? "").toLowerCase().trim();
        if (!domain || !domain.includes(".")) continue;
        domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
        const tld = domain.split(".").slice(1).join(".").toLowerCase();
        if (tld) tldCounts.set(tld, (tldCounts.get(tld) ?? 0) + 1);
      }
    }

    const pickTop = (m: Map<string, number>): string | null => {
      let best: { k: string; v: number } | null = null;
      for (const [k, v] of m.entries()) {
        if (!best || v > best.v) best = { k, v };
      }
      return best?.k ?? null;
    };

    res.json({
      mostPopularTld: pickTop(tldCounts),
      mostBoughtDomain: pickTop(domainCounts),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to load home stats" });
  }
});

export default router;

