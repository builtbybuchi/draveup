import express, { Router, type Request, type Response } from "express";
import { verifyPaystackWebhookSignature } from "../lib/paystack.js";
import { applySuccessfulOrder } from "./orders.js";
import { applySuccessfulTopUp } from "./wallet.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post(
  "/api/webhooks/paystack",
  // We need the raw body to compute the HMAC-SHA512 hash exactly as Paystack sent it.
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const signature = req.headers["x-paystack-signature"] as string;
    if (!signature) {
      logger.warn("Paystack webhook rejected: missing signature header");
      return res.status(401).send("Unauthorized");
    }

    const payloadString = (req.body as Buffer).toString("utf8");

    if (!verifyPaystackWebhookSignature(payloadString, signature)) {
      logger.warn("Paystack webhook rejected: invalid signature");
      return res.status(401).send("Unauthorized");
    }

    res.status(200).send("OK");

    try {
      const event = JSON.parse(payloadString);
      if (event.event === "charge.success") {
        const reference = event.data.reference;
        logger.info({ reference }, "Paystack successful charge webhook received");
        
        if (reference.startsWith("DRV-ORD-")) {
          await applySuccessfulOrder(reference).catch((err) =>
            logger.error({ reference, err }, "Failed to apply successful order from Paystack webhook"),
          );
        } else if (reference.startsWith("DRV-WAL-")) {
          await applySuccessfulTopUp(reference).catch((err) =>
            logger.error({ reference, err }, "Failed to apply successful wallet top-up from Paystack webhook"),
          );
        } else {
          logger.warn({ reference }, "Unknown Paystack reference format");
        }
      }
    } catch (e) {
      logger.error(e, "Error processing Paystack webhook");
    }
  },
);

export default router;
