/**
 * Fulfilment pipeline — invoked when an order transitions to PAID.
 *
 * For domain orders this calls the matching Dynadot command and mirrors
 * the result into the Domain table. On Dynadot failure the order is
 * left as PAID (not FULFILLED) so it can be retried; the error is
 * stored in order.metadata.fulfillmentError.
 */

import { prisma } from "./prisma.js";
import { registerDomain, renewDomain, transferDomain } from "./dynadot.js";
import { DomainStatus } from "@prisma/client";
import type { Order } from "@prisma/client";

export async function fulfillOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PAID") return;

  switch (order.type) {
    case "DOMAIN_REGISTRATION":
      await fulfillRegistration(order);
      break;
    case "DOMAIN_RENEWAL":
      await fulfillRenewal(order);
      break;
    case "DOMAIN_TRANSFER":
      await fulfillTransfer(order);
      break;
    case "DOMAIN_RESTORE":
      // Restore requires manual admin action in Dynadot; leave PAID and note it.
      await setFulfillmentNote(order.id, "DOMAIN_RESTORE requires manual admin action in Dynadot dashboard.");
      break;
    default:
      // EMAIL_SUBSCRIPTION, HOSTING, ACCOUNT_CREDIT — immediately fulfilled.
      await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
  }
}

// ─── DOMAIN REGISTRATION ──────────────────────────────────────────────────────

async function fulfillRegistration(order: Order): Promise<void> {
  const meta = (order.metadata as Record<string, any>) ?? {};
  const items: any[] = meta.items ?? [];
  const item = items.find((i: any) => i.type === "DOMAIN_REGISTRATION") ?? items[0];
  const domainName = String(item?.name ?? item?.metadata?.domain ?? "").toLowerCase().trim();
  const years = Number(item?.period ?? item?.metadata?.years ?? 1);
  if (!domainName) return setFulfillmentNote(order.id, "Cannot determine domain name from order metadata.");

  const result = await registerDomain({ domain: domainName, years });
  if (!result.ok) return setFulfillmentError(order.id, result.message);

  const tld = extractTld(domainName);
  await prisma.domain.upsert({
    where: { domainName },
    create: {
      userId: order.userId,
      domainName,
      tld,
      status: DomainStatus.ACTIVE,
      registeredAt: new Date(),
      expiresAt: new Date(result.data.expiresAt),
      autoRenew: true,
      locked: true,
      nameservers: ["ns1.dynadot.com", "ns2.dynadot.com"],
      lastSyncedAt: new Date(),
    },
    update: {
      userId: order.userId,  // reassign ownership on re-registration
      status: DomainStatus.ACTIVE,
      expiresAt: new Date(result.data.expiresAt),
      lastSyncedAt: new Date(),
    },
  });

  await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
}

// ─── DOMAIN RENEWAL ───────────────────────────────────────────────────────────

async function fulfillRenewal(order: Order): Promise<void> {
  const meta = (order.metadata as Record<string, any>) ?? {};
  const items: any[] = meta.items ?? [];
  const item = items.find((i: any) => i.type === "DOMAIN_RENEWAL") ?? items[0];
  const domainName = String(item?.name ?? item?.metadata?.domain ?? "").toLowerCase().trim();
  const years = Number(item?.period ?? item?.metadata?.years ?? 1);
  if (!domainName) return setFulfillmentNote(order.id, "Cannot determine domain name from order metadata.");

  const result = await renewDomain(domainName, years);
  if (!result.ok) return setFulfillmentError(order.id, result.message);

  const updated = await prisma.domain.updateMany({
    where: { domainName, userId: order.userId },
    data: { expiresAt: new Date(result.data.expiresAt), lastSyncedAt: new Date() },
  });

  // Guard: if no row was updated, the domain isn't owned by this user in the DB.
  // Never upsert/reassign ownership on renewal — record an error for manual review.
  if (updated.count === 0) {
    return setFulfillmentError(
      order.id,
      `Renewal succeeded at Dynadot but no domain row owned by user ${order.userId} was found for "${domainName}". Manual admin action required.`,
    );
  }

  await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
}

// ─── DOMAIN TRANSFER ──────────────────────────────────────────────────────────

async function fulfillTransfer(order: Order): Promise<void> {
  const meta = (order.metadata as Record<string, any>) ?? {};
  const items: any[] = meta.items ?? [];
  const item = items.find((i: any) => i.type === "DOMAIN_TRANSFER") ?? items[0];
  const domainName = String(item?.name ?? item?.metadata?.domain ?? "").toLowerCase().trim();
  const authCode = String(meta.authCode ?? item?.metadata?.authCode ?? "");
  if (!domainName) return setFulfillmentNote(order.id, "Cannot determine domain name from order metadata.");
  if (!authCode) return setFulfillmentNote(order.id, "Transfer auth code missing — customer must re-submit with auth code.");

  const result = await transferDomain(domainName, authCode);
  if (!result.ok) return setFulfillmentError(order.id, result.message);

  const tld = extractTld(domainName);
  await prisma.domain.upsert({
    where: { domainName },
    create: {
      userId: order.userId,
      domainName,
      tld,
      status: DomainStatus.PENDING_TRANSFER,
      registeredAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 86400_000),
      lastSyncedAt: new Date(),
    },
    update: {
      userId: order.userId,  // reassign ownership on incoming transfer
      status: DomainStatus.PENDING_TRANSFER,
      lastSyncedAt: new Date(),
    },
  });
  await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function extractTld(domainName: string): string {
  const idx = domainName.lastIndexOf(".");
  return idx < 0 ? "" : domainName.slice(idx + 1).toLowerCase();
}

async function setFulfillmentError(orderId: string, message: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  await prisma.order.update({
    where: { id: orderId },
    data: {
      metadata: {
        ...((order?.metadata as Record<string, any>) ?? {}),
        fulfillmentError: message,
        fulfillmentAttemptedAt: new Date().toISOString(),
      } as any,
    },
  });
}

async function setFulfillmentNote(orderId: string, note: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  await prisma.order.update({
    where: { id: orderId },
    data: {
      metadata: {
        ...((order?.metadata as Record<string, any>) ?? {}),
        fulfillmentNote: note,
      } as any,
    },
  });
}

export type { Order };
