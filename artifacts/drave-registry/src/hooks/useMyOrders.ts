import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

export interface MyOrder {
  id: string;
  type: string;
  description: string;
  status: "PENDING" | "PAID" | "FULFILLED" | "FAILED" | "CANCELLED";
  amountUsd: number;
  displayAmount: number;
  displayCurrency: string;
  ngnAmount: number;
  paymentMethod: "WALLET" | "SQUADCO";
  paymentRef: string | null;
  createdAt: string;
  metadata?: {
    fulfillmentNote?: string;
    fulfillmentError?: string;
    [key: string]: any;
  };
}

export function useMyOrders() {
  return useQuery<{ items: MyOrder[]; nextCursor: string | null }>({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/orders?limit=50"));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });
}
