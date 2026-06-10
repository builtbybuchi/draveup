import crypto from "node:crypto";

export function paystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

export async function verifyPaystackTransaction(reference: string): Promise<{ success: boolean; amount: number; currency: string; data?: any }> {
  if (!paystackConfigured()) throw new Error("Paystack not configured");
  
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Failed to verify transaction");
  
  if (json.data.status === "success") {
    // Paystack amounts are in kobo/cents. Convert back to major unit.
    return {
      success: true,
      amount: json.data.amount / 100,
      currency: json.data.currency,
      data: json.data,
    };
  }
  return { success: false, amount: 0, currency: "" };
}

export function verifyPaystackWebhookSignature(payload: string, signature: string): boolean {
  if (!process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest("hex");
  return hash === signature;
}
