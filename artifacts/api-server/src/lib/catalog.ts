/**
 * Server-side product catalog. The HTTP API never trusts client-supplied
 * prices — every order line item is re-priced from this module (or from
 * the Tld table for domain operations) before settlement.
 */

import { OrderType } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface PricedLine {
  type: OrderType;
  name: string;
  description: string;
  unitPriceUsd: number;
  quantity: number;
  period: number;
  subtotalUsd: number;
  metadata: Record<string, unknown>;
}

// ─── EMAIL PLANS (USD per mailbox per month) ──────────────────────────────────
// Source of truth for email subscription pricing. Keep in sync with the
// marketing pages but the SERVER value always wins.
export const EMAIL_PLANS: Record<string, { name: string; monthlyUsd: number; storage: string }> = {
  starter: { name: "Starter", monthlyUsd: 1.99, storage: "30 GB" },
  business: { name: "Business", monthlyUsd: 3.99, storage: "100 GB" },
  enterprise: { name: "Enterprise", monthlyUsd: 6.99, storage: "Unlimited" },
};

export function priceEmailPlan(
  planKey: string,
  years: number,
  mailboxes: number,
): { unitPriceUsd: number; line: { name: string; description: string } } {
  const plan = EMAIL_PLANS[planKey];
  if (!plan) throw new Error(`Unknown email plan: ${planKey}`);
  // Annual = monthly * 12. unitPriceUsd is per mailbox per period (years).
  const unitPriceUsd = +(plan.monthlyUsd * 12 * years).toFixed(2);
  return {
    unitPriceUsd,
    line: {
      name: `${plan.name} email plan`,
      description: `${mailboxes} mailbox${mailboxes === 1 ? "" : "es"} · ${years} yr · ${plan.storage}`,
    },
  };
}

// ─── DOMAIN PRICING (resolved from Tld table) ─────────────────────────────────
function extractTld(domainName: string): string {
  const idx = domainName.lastIndexOf(".");
  if (idx < 0 || idx === domainName.length - 1) throw new Error(`Invalid domain: ${domainName}`);
  return domainName.slice(idx + 1).toLowerCase();
}

export async function priceDomain(
  type: OrderType,
  domainName: string,
  years: number,
): Promise<number> {
  const tldName = extractTld(domainName);
  const tld = await prisma.tld.findUnique({ where: { name: tldName } });
  if (!tld || !tld.enabled) throw new Error(`TLD .${tldName} is not available`);
  let perYear: number | null = null;
  switch (type) {
    case OrderType.DOMAIN_REGISTRATION:
      perYear = tld.priceRegister ? Number(tld.priceRegister) : null;
      break;
    case OrderType.DOMAIN_RENEWAL:
      perYear = tld.priceRenew ? Number(tld.priceRenew) : null;
      break;
    case OrderType.DOMAIN_TRANSFER:
      perYear = tld.priceTransfer ? Number(tld.priceTransfer) : null;
      break;
    case OrderType.DOMAIN_RESTORE:
      perYear = tld.priceRestore ? Number(tld.priceRestore) : null;
      break;
    default:
      throw new Error(`priceDomain called with non-domain type ${type}`);
  }
  if (perYear == null || perYear <= 0) {
    throw new Error(`No retail price set for .${tldName} ${type}`);
  }
  return +(perYear * Math.max(1, years)).toFixed(2);
}

export interface ClientItemSpec {
  type: keyof typeof OrderType;
  domain?: string;
  planKey?: string;
  years?: number;
  quantity?: number;
  /** EPP/auth code — required for DOMAIN_TRANSFER; stored in item metadata for fulfillment. */
  authCode?: string;
}

/**
 * Re-price an array of client item specs against the server catalog.
 * Throws on any unknown plan / TLD / unsupported type.
 */
export async function priceItems(items: ClientItemSpec[]): Promise<PricedLine[]> {
  const out: PricedLine[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") throw new Error("Invalid item");
    const typeStr = String(raw.type);
    if (!(typeStr in OrderType)) throw new Error(`Unknown order type: ${typeStr}`);
    const type = OrderType[typeStr as keyof typeof OrderType];
    const years = Math.max(1, Math.min(10, Number(raw.years) || 1));
    const quantity = Math.max(1, Math.min(100, Number(raw.quantity) || 1));

    if (
      type === OrderType.DOMAIN_REGISTRATION ||
      type === OrderType.DOMAIN_RENEWAL ||
      type === OrderType.DOMAIN_TRANSFER ||
      type === OrderType.DOMAIN_RESTORE
    ) {
      const domain = String(raw.domain || "").toLowerCase().trim();
      if (!domain) throw new Error(`Missing domain for ${typeStr}`);
      const unit = await priceDomain(type, domain, years);
      out.push({
        type,
        name: domain,
        description: `${typeStr.replace(/_/g, " ").toLowerCase()} · ${years} yr`,
        unitPriceUsd: unit,
        quantity,
        period: years,
        subtotalUsd: +(unit * quantity).toFixed(2),
        metadata: {
          domain,
          years,
          ...(type === OrderType.DOMAIN_TRANSFER && raw.authCode
            ? { authCode: raw.authCode }
            : {}),
        },
      });
      continue;
    }

    if (type === OrderType.EMAIL_SUBSCRIPTION) {
      const planKey = String(raw.planKey || "").toLowerCase();
      const priced = priceEmailPlan(planKey, years, quantity);
      out.push({
        type,
        name: priced.line.name,
        description: priced.line.description,
        unitPriceUsd: priced.unitPriceUsd,
        quantity,
        period: years,
        subtotalUsd: +(priced.unitPriceUsd * quantity).toFixed(2),
        metadata: { planKey, years, mailboxes: quantity },
      });
      continue;
    }

    throw new Error(`Unsupported order type for client checkout: ${typeStr}`);
  }
  if (out.length === 0) throw new Error("No items");
  return out;
}
