import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

export interface MyContact {
  id: string;
  type: "REGISTRANT" | "ADMIN" | "TECH" | "BILLING";
  firstName: string;
  lastName: string;
  organization: string | null;
  email: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  createdAt: string;
}

export type ContactInput = Omit<MyContact, "id" | "createdAt">;

async function apiFetch(path: string, init?: RequestInit) {
  const r = await fetch(apiUrl(path), init);
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export function useMyContacts() {
  return useQuery<MyContact[]>({
    queryKey: ["my-contacts"],
    queryFn: () => apiFetch("/api/contacts"),
    staleTime: 60_000,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactInput) =>
      apiFetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-contacts"] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactInput }) =>
      apiFetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-contacts"] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-contacts"] }),
  });
}
