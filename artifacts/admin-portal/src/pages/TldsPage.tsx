import { useEffect, useState } from "react";
import { useApi } from "../api";

interface Tld {
  id: string;
  name: string;
  enabled: boolean;
  costRegister: number | null;
  costRenew: number | null;
  costTransfer: number | null;
  costRestore: number | null;
  priceRegister: number | null;
  priceRenew: number | null;
  priceTransfer: number | null;
  priceRestore: number | null;
  lastSyncedAt: string | null;
}

export function TldsPage({ role }: { role: string }) {
  const api = useApi();
  const isAdmin = role === "ADMIN";
  const [tlds, setTlds] = useState<Tld[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, Partial<Tld>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api("/api/admin/tlds")
      .then((d) => { setTlds(d); setErr(null); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await api("/api/admin/tlds/sync", { method: "POST" });
      setSyncMsg(`Synced ${r.total} TLDs — ${r.added} added, ${r.updated} updated, ${r.removed} disabled.`);
      load();
    } catch (e: any) {
      setSyncMsg(`Error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const updateField = (id: string, key: keyof Tld, val: any) => {
    setEdit((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  };

  const save = async (t: Tld) => {
    const changes = edit[t.id];
    if (!changes) return;
    setSavingId(t.id);
    try {
      const body: any = {};
      ["priceRegister", "priceRenew", "priceTransfer", "priceRestore", "enabled"].forEach((k) => {
        if (changes[k as keyof Tld] !== undefined) {
          const v = (changes as any)[k];
          body[k] = k === "enabled" ? !!v : v === "" || v === null ? null : Number(v);
        }
      });
      const updated = await api(`/api/admin/tlds/${t.name}`, { method: "PUT", body: JSON.stringify(body) });
      setTlds((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...updated, priceRegister: updated.priceRegister ? Number(updated.priceRegister) : null, priceRenew: updated.priceRenew ? Number(updated.priceRenew) : null, priceTransfer: updated.priceTransfer ? Number(updated.priceTransfer) : null, priceRestore: updated.priceRestore ? Number(updated.priceRestore) : null } : x)));
      setEdit((prev) => { const n = { ...prev }; delete n[t.id]; return n; });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingId(null);
    }
  };

  const filtered = tlds.filter((t) => t.name.includes(filter.toLowerCase()));

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">TLDs &amp; pricing</h2>
          <p className="text-slate-500 text-sm mt-1">
            Wholesale costs come from Dynadot. Retail prices are what customers see across the registry.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={sync}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
          >
            {syncing ? "Syncing…" : "Sync from Dynadot"}
          </button>
        )}
      </div>

      {syncMsg && <div className="p-3 mb-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">{syncMsg}</div>}
      {err && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{err}</div>}

      <div className="mb-4 flex items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by TLD…"
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64"
        />
        <span className="text-xs text-slate-500">{filtered.length} of {tlds.length}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">TLD</th>
              <th className="px-4 py-3 text-right">Cost reg</th>
              <th className="px-4 py-3 text-right">Cost renew</th>
              <th className="px-4 py-3 text-right">Cost xfer</th>
              <th className="px-4 py-3 text-right">Price reg</th>
              <th className="px-4 py-3 text-right">Price renew</th>
              <th className="px-4 py-3 text-right">Price xfer</th>
              <th className="px-4 py-3 text-right">Price restore</th>
              <th className="px-4 py-3 text-center">Enabled</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-8 text-center text-slate-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="p-8 text-center text-slate-500">
                No TLDs yet. {isAdmin ? "Click \"Sync from Dynadot\" above." : "Ask an admin to run a Dynadot sync."}
              </td></tr>
            ) : filtered.map((t) => {
              const e = edit[t.id] || {};
              const dirty = Object.keys(e).length > 0;
              const enabled = e.enabled !== undefined ? !!e.enabled : t.enabled;
              return (
                <tr key={t.id} className={`border-t border-slate-100 ${!t.enabled ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-bold text-blue-600">.{t.name}</td>
                  <td className="px-4 py-3 text-right text-slate-500">${t.costRegister != null ? Number(t.costRegister).toFixed(2) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-500">${t.costRenew != null ? Number(t.costRenew).toFixed(2) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-500">${t.costTransfer != null ? Number(t.costTransfer).toFixed(2) : "—"}</td>
                  <PriceCell t={t} field="priceRegister" edit={e} update={updateField} disabled={!isAdmin} />
                  <PriceCell t={t} field="priceRenew" edit={e} update={updateField} disabled={!isAdmin} />
                  <PriceCell t={t} field="priceTransfer" edit={e} update={updateField} disabled={!isAdmin} />
                  <PriceCell t={t} field="priceRestore" edit={e} update={updateField} disabled={!isAdmin} />
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={!isAdmin}
                      onChange={(ev) => updateField(t.id, "enabled", ev.target.checked)}
                    />
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => save(t)}
                        disabled={!dirty || savingId === t.id}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 text-white disabled:opacity-30"
                      >
                        {savingId === t.id ? "…" : "Save"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriceCell({
  t, field, edit, update, disabled,
}: {
  t: Tld;
  field: "priceRegister" | "priceRenew" | "priceTransfer" | "priceRestore";
  edit: Partial<Tld>;
  update: (id: string, key: keyof Tld, val: any) => void;
  disabled: boolean;
}) {
  const current = edit[field] !== undefined ? edit[field] : t[field];
  const display = current === null || current === undefined ? "" : String(current);
  return (
    <td className="px-2 py-2 text-right">
      <input
        type="number"
        step="0.01"
        min="0"
        value={display}
        disabled={disabled}
        onChange={(e) => update(t.id, field, e.target.value)}
        className="w-20 px-2 py-1 text-right border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-500"
        placeholder="—"
      />
    </td>
  );
}
