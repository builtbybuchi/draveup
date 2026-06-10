import { useQuery } from "@tanstack/react-query";

export interface HomeStats {
  mostPopularTld: string | null;
  mostBoughtDomain: string | null;
}

export function useHomeStats() {
  return useQuery<HomeStats>({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const r = await fetch("/api/home/stats");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 60 * 1000,
  });
}

