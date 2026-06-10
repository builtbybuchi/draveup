import { prisma } from "./prisma.js";

/**
 * Convert a USD amount into NGN using the admin-managed Currency rates.
 * Rates are stored as "units per 1 USD" (e.g. NGN.rate = 1600).
 */
export async function usdToNgn(usd: number): Promise<number> {
  const ngn = await prisma.currency.findUnique({ where: { code: "NGN" } });
  if (!ngn) throw new Error("NGN currency not configured");
  return Math.round(usd * Number(ngn.rate) * 100) / 100;
}

/**
 * Convert a USD amount into the user's display currency.
 */
export async function usdToDisplay(usd: number, code: string): Promise<{ amount: number; symbol: string }> {
  const c = await prisma.currency.findUnique({ where: { code } });
  if (!c) return { amount: usd, symbol: "$" };
  return { amount: Math.round(usd * Number(c.rate) * 100) / 100, symbol: c.symbol };
}
