import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

export interface MyDomain {
  id: string;
  domainName: string;
  tld: string;
  status: "ACTIVE" | "EXPIRED" | "PENDING_TRANSFER" | "SUSPENDED" | "CANCELLED";
  registeredAt: string;
  expiresAt: string;
  autoRenew: boolean;
  locked: boolean;
  privacyOn: boolean;
  nameservers: string[];
  registrantContactId: string | null;
  lastSyncedAt: string | null;
}

async function apiFetch(path: string, init?: RequestInit) {
  const r = await fetch(apiUrl(path), init);
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.message || j?.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export function useMyDomains() {
  return useQuery<MyDomain[]>({
    queryKey: ["my-domains"],
    queryFn: () => apiFetch("/api/domains"),
    staleTime: 30_000,
  });
}

export function useLockDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, lock }: { name: string; lock: boolean }) =>
      apiFetch(`/api/domains/${encodeURIComponent(name)}/${lock ? "lock" : "unlock"}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-domains"] }),
  });
}

export function usePrivacyDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, on }: { name: string; on: boolean }) =>
      apiFetch(`/api/domains/${encodeURIComponent(name)}/privacy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-domains"] }),
  });
}

export function useSetNameservers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, nameservers }: { name: string; nameservers: string[] }) =>
      apiFetch(`/api/domains/${encodeURIComponent(name)}/nameservers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameservers }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-domains"] }),
  });
}

export function useSyncDomains() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/domains/sync", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-domains"] }),
  });
}
