import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@clerk/react";

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
  const { getToken } = useAuth();
  
  return useQuery<{ balanceUsd: number }>({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const token = await getToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const r = await fetch(apiUrl("/api/wallet/balance"), { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useWalletTransactions() {
  const { getToken } = useAuth();

  return useQuery<{ items: WalletTxn[]; nextCursor: string | null }>({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const token = await getToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const r = await fetch(apiUrl("/api/wallet/transactions?limit=50"), { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (Array.isArray(data)) return { items: data, nextCursor: null };
      return data;
    },
    staleTime: 30_000,
  });
}
