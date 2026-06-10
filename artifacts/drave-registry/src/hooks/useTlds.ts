import { useQuery } from "@tanstack/react-query";

export interface ApiTld {
  tld: string;       // "com"
  ext: string;       // ".com"
  priceRegister: number | null;
  priceRenew: number | null;
  priceTransfer: number | null;
  priceRestore: number | null;
}

export function useTlds() {
  return useQuery<ApiTld[]>({
    queryKey: ["tlds"],
    queryFn: async () => {
      const r = await fetch("/api/tlds");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface DomainSearchResult {
  domain: string;
  tld: string;
  available: boolean;
  priceUsd?: number;
  renewUsd?: number;
}

export async function searchDomains(
  query: string,
  tlds?: string[],
  opts?: { signal?: AbortSignal },
) {
  const params = new URLSearchParams({ query });
  if (tlds && tlds.length) params.set("tlds", tlds.join(","));
  const r = await fetch(`/api/domains/search?${params.toString()}`, { signal: opts?.signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return (data.results || []) as DomainSearchResult[];
}
