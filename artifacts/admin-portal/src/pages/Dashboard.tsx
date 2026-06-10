import { useEffect, useState } from "react";
import { useApi } from "../api";

export function Dashboard() {
  const api = useApi();
  const [counts, setCounts] = useState<{ tlds: number; enabled: number; currencies: number; users: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api("/api/admin/tlds"), api("/api/admin/currencies"), api("/api/admin/users")])
      .then(([tlds, currencies, users]) => {
        setCounts({
          tlds: tlds.length,
          enabled: tlds.filter((t: any) => t.enabled).length,
          currencies: currencies.length,
          users: users.length,
        });
      })
      .catch((e) => setErr(e.message));
  }, [api]);

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
      <p className="text-slate-500 mb-8">Manage TLDs, retail pricing, currencies, and users from one place.</p>

      {err && <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total TLDs" value={counts?.tlds ?? "—"} />
        <Stat label="Enabled TLDs" value={counts?.enabled ?? "—"} />
        <Stat label="Currencies" value={counts?.currencies ?? "—"} />
        <Stat label="Users (recent)" value={counts?.users ?? "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="text-3xl font-extrabold mt-2 text-slate-900">{value}</div>
    </div>
  );
}
