import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

async function updateExchangeRatesIfNeeded() {
  const usdCurrency = await prisma.currency.findUnique({ where: { code: "USD" } });
  if (!usdCurrency) return; // DB not initialized yet
  
  const now = new Date();
  const lastUpdated = usdCurrency.updatedAt;
  
  // Check if updated today (compare date strings in YYYY-MM-DD format)
  const isUpdatedToday = lastUpdated.toISOString().split("T")[0] === now.toISOString().split("T")[0];
  
  if (!isUpdatedToday) {
    try {
      // Fetch latest rates from open API (base USD)
      const r = await fetch("https://open.er-api.com/v6/latest/USD");
      if (r.ok) {
        const data = await r.json();
        if (data && data.rates) {
          const currencies = await prisma.currency.findMany({ where: { enabled: true } });
          for (const c of currencies) {
            if (c.code === "USD") {
              await prisma.currency.update({ where: { code: "USD" }, data: { rate: 1, updatedAt: now } });
            } else if (data.rates[c.code]) {
              await prisma.currency.update({
                where: { code: c.code },
                data: { rate: data.rates[c.code], updatedAt: now }
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to update exchange rates:", e);
    }
  }
}

/** GET /api/currency — public list of enabled currencies + rates. Also triggers auto-update if out of date. */
router.get("/currency", async (_req, res) => {
  // Fire and forget rate update (doesn't block the request)
  updateExchangeRatesIfNeeded().catch(console.error);

  const list = await prisma.currency.findMany({
    where: { enabled: true },
    orderBy: { code: "asc" },
  });
  res.json(
    list.map((c: any) => ({
      code: c.code,
      symbol: c.symbol,
      name: c.name,
      flag: c.flag,
      rate: Number(c.rate),
      lastUpdated: c.updatedAt
    })),
  );
});

export default router;
