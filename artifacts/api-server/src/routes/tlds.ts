import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

/** GET /api/tlds — public, returns enabled TLDs with retail prices in USD. */
router.get("/tlds", async (_req, res) => {
  try {
    const tlds = await prisma.tld.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
    });
    res.json(
      tlds.map((t: any) => ({
        tld: t.name,
        ext: `.${t.name}`,
        priceRegister: t.priceRegister ? Number(t.priceRegister) : null,
        priceRenew: t.priceRenew ? Number(t.priceRenew) : null,
        priceTransfer: t.priceTransfer ? Number(t.priceTransfer) : null,
        priceRestore: t.priceRestore ? Number(t.priceRestore) : null,
      })),
    );
  } catch (err) {
    console.error("GET /tlds error:", err);
    res.status(500).json({ error: "Failed to fetch TLDs" });
  }
});

export default router;
