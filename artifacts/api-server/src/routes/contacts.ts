/**
 * WHOIS Contact profiles
 *
 * GET    /api/contacts          — list current user's contact profiles
 * POST   /api/contacts          — create a contact profile
 * PATCH  /api/contacts/:id      — update a contact profile
 * DELETE /api/contacts/:id      — delete a contact profile
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { ContactType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const router = Router();

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

const VALID_TYPES: ContactType[] = ["REGISTRANT", "ADMIN", "TECH", "BILLING"];

function parseContactBody(body: any) {
  const { type, firstName, lastName, organization, email, phone, address1, address2, city, state, postalCode, country } = body ?? {};
  const errors: string[] = [];
  if (!firstName) errors.push("firstName");
  if (!lastName) errors.push("lastName");
  if (!email) errors.push("email");
  if (!phone) errors.push("phone");
  if (!address1) errors.push("address1");
  if (!city) errors.push("city");
  if (!postalCode) errors.push("postalCode");
  if (!country) errors.push("country");
  if (errors.length) throw new Error(`Missing required fields: ${errors.join(", ")}`);
  const contactType: ContactType = VALID_TYPES.includes(type) ? type : "REGISTRANT";
  return { type: contactType, firstName: String(firstName), lastName: String(lastName), organization: organization ? String(organization) : undefined, email: String(email), phone: String(phone), address1: String(address1), address2: address2 ? String(address2) : undefined, city: String(city), state: state ? String(state) : undefined, postalCode: String(postalCode), country: String(country) };
}

router.get("/contacts", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const contacts = await prisma.contact.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(contacts);
});

router.post("/contacts", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  let data: ReturnType<typeof parseContactBody>;
  try { data = parseContactBody(req.body); } catch (e: any) { return res.status(400).json({ error: e.message }); }
  const contact = await prisma.contact.create({ data: { userId: u.id, ...data } });
  res.status(201).json(contact);
});

router.patch("/contacts/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== u.id) return res.status(404).json({ error: "Contact not found" });
  let data: ReturnType<typeof parseContactBody>;
  try { data = parseContactBody(req.body); } catch (e: any) { return res.status(400).json({ error: e.message }); }
  const contact = await prisma.contact.update({ where: { id: req.params.id }, data });
  res.json(contact);
});

router.delete("/contacts/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getDbUser(req.clerkUserId!);
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== u.id) return res.status(404).json({ error: "Contact not found" });
  await prisma.contact.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
