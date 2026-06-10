import { useQuery } from "@tanstack/react-query";

export interface WalletTxn {
  id: string;
  type: "CREDIT" | "DEBIT";
  amountUsd: number;
  balanceAfterUsd: number;
  source: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  description: string | null;
  createdAt: string;
}

export function useWalletBalance() {
  return useQuery<{ balanceUsd: number }>({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const r = await fetch("/api/wallet/balance");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useWalletTransactions() {
  return useQuery<{ items: WalletTxn[]; nextCursor: string | null }>({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const r = await fetch("/api/wallet/transactions?limit=50");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (Array.isArray(data)) return { items: data, nextCursor: null };
      return data;
    },
    staleTime: 30_000,
  });
}
