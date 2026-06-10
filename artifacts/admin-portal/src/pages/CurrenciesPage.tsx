import { useEffect, useState } from "react";
import { useApi } from "../api";

interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string | null;
  rate: number;
  enabled: boolean;
}

const BLANK = { code: "", symbol: "", name: "", flag: "", rate: 1 };

export function CurrenciesPage({ role }: { role: string }) {
  const api = useApi();
  const isAdmin = role === "ADMIN";
  const [list, setList] = useState<Currency[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, Partial<Currency>>>({});
  const [creating, setCreating] = useState<typeof BLANK>(BLANK);

  const load = () => {
    api("/api/admin/currencies").then(setList).catch((e) => setErr(e.message));
  };
  useEffect(load, []);

  const update = (code: string, key: keyof Currency, val: any) => {
    setEdit((p) => ({ ...p, [code]: { ...p[code], [key]: val } }));
  };

  const save = async (c: Currency) => {
    const changes = edit[c.code];
    if (!changes) return;
    try {
      const body: any = {};
      ["rate", "symbol", "name", "flag", "enabled"].forEach((k) => {
        if ((changes as any)[k] !== undefined) {
          body[k] = k === "rate" ? Number((changes as any)[k]) : (changes as any)[k];
        }
      });
      await api(`/api/admin/currencies/${c.code}`, { method: "PUT", body: JSON.stringify(body) });
      setEdit((p) => { const n = { ...p }; delete n[c.code]; return n; });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const create = async () => {
    if (!creating.code || !creating.symbol || !creating.name) {
      alert("Code, symbol, and name are required");
      return;
    }
    try {
      await api("/api/admin/currencies", {
        method: "POST",
        body: JSON.stringify({ ...creating, rate: Number(creating.rate) || 1, enabled: true }),
      });
      setCreating(BLANK);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const remove = async (code: string) => {
    if (!confirm(`Delete ${code}?`)) return;
    try { await api(`/api/admin/currencies/${code}`, { method: "DELETE" }); load(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold mb-1">Currencies &amp; exchange rates</h2>
      <p className="text-slate-500 text-sm mb-6">
        Rates are <strong>1 USD = N CURRENCY</strong>. USD is the base and cannot be deleted.
      </p>
      {err && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{err}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-left">Flag</th>
              <th className="px-4 py-3 text-right">Rate (per 1 USD)</th>
              <th className="px-4 py-3 text-center">Enabled</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const e = edit[c.code] || {};
              const dirty = Object.keys(e).length > 0;
              return (
                <tr key={c.code} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-bold text-slate-900">{c.code}</td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={c.name}
                      disabled={!isAdmin}
                      onChange={(ev) => update(c.code, "name", ev.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded w-44 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={c.symbol}
                      disabled={!isAdmin}
                      onChange={(ev) => update(c.code, "symbol", ev.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded w-16 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={c.flag ?? ""}
                      disabled={!isAdmin}
                      onChange={(ev) => update(c.code, "flag", ev.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded w-16 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      defaultValue={c.rate}
                      disabled={!isAdmin || c.code === "USD"}
                      onChange={(ev) => update(c.code, "rate", ev.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded w-28 text-right disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      defaultChecked={c.enabled}
                      disabled={!isAdmin || c.code === "USD"}
                      onChange={(ev) => update(c.code, "enabled", ev.target.checked)}
                    />
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        disabled={!dirty}
                        onClick={() => save(c)}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 text-white disabled:opacity-30 mr-2"
                      >
                        Save
                      </button>
                      {c.code !== "USD" && (
                        <button
                          onClick={() => remove(c.code)}
                          className="px-3 py-1.5 text-xs font-semibold rounded bg-red-50 text-red-700 border border-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold mb-4">Add a currency</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <Field label="Code (3-letter)" value={creating.code} onChange={(v) => setCreating({ ...creating, code: v.toUpperCase() })} />
            <Field label="Name" value={creating.name} onChange={(v) => setCreating({ ...creating, name: v })} />
            <Field label="Symbol" value={creating.symbol} onChange={(v) => setCreating({ ...creating, symbol: v })} />
            <Field label="Flag (emoji)" value={creating.flag} onChange={(v) => setCreating({ ...creating, flag: v })} />
            <Field label="Rate per 1 USD" value={String(creating.rate)} onChange={(v) => setCreating({ ...creating, rate: Number(v) || 0 })} type="number" />
            <button onClick={create} className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
              Add currency
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="text-xs text-slate-500 font-semibold flex flex-col gap-1">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 border border-slate-200 rounded-lg text-sm font-normal text-slate-900"
      />
    </label>
  );
}
