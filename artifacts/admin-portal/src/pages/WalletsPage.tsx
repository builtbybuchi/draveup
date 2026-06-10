import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api";

interface UserWallet {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  walletBalanceNgn: number;
  role: string;
  createdAt: string;
}

interface Txn {
  id: string;
  type: "CREDIT" | "DEBIT" | "HOLD" | "RELEASE";
  amountNgn: number;
  balanceAfterNgn: number;
  source: string;
  status: string;
  description: string | null;
  reference: string | null;
  createdAt: string;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null };
}

function fmtNgn(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function WalletsPage({ role }: { role: "ADMIN" | "CUSTOMER_SERVICE" | "CUSTOMER" }) {
  const api = useApi();
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserWallet | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [adjType, setAdjType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjErr, setAdjErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"users" | "global">("users");
  const [globalTxns, setGlobalTxns] = useState<Txn[]>([]);
  const [globalCursor, setGlobalCursor] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api("/api/admin/wallets");
      setWallets(list);
    } catch (e: any) {
      setAdjErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadGlobal = useCallback(async (cursor?: string) => {
    setGlobalLoading(true);
    try {
      const url = cursor
        ? `/api/admin/wallet-transactions?limit=100&cursor=${encodeURIComponent(cursor)}`
        : "/api/admin/wallet-transactions?limit=100";
      const r = await api(url);
      setGlobalTxns((prev) => cursor ? [...prev, ...r.items] : r.items);
      setGlobalCursor(r.nextCursor);
    } catch (e: any) {
      setAdjErr(e.message);
    } finally {
      setGlobalLoading(false);
    }
  }, [api]);

  useEffect(() => { if (tab === "global" && globalTxns.length === 0) loadGlobal(); }, [tab, globalTxns.length, loadGlobal]);

  useEffect(() => { load(); }, [load]);

  const openUser = async (u: UserWallet) => {
    setSelected(u);
    setTxns([]);
    setAdjErr(null);
    try {
      const t = await api(`/api/admin/wallets/${u.id}/transactions?limit=200`);
      setTxns(Array.isArray(t?.items) ? t.items : []);
    } catch (e: any) {
      setAdjErr(e.message);
    }
  };

  const adjust = async () => {
    if (!selected) return;
    setAdjErr(null);
    setBusy(true);
    try {
      const amt = Number(adjAmount);
      if (!amt || amt <= 0) throw new Error("Amount must be > 0");
      const r = await api(`/api/admin/wallets/${selected.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ type: adjType, amountNgn: amt, description: adjDesc || undefined }),
      });
      setAdjAmount("");
      setAdjDesc("");
      setSelected({ ...selected, walletBalanceNgn: Number(r.newBalanceNgn) });
      const t = await api(`/api/admin/wallets/${selected.id}/transactions`);
      setTxns(t);
      load();
    } catch (e: any) {
      setAdjErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = wallets.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.firstName || "").toLowerCase().includes(q) ||
      (u.lastName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer wallets</h1>
          <p className="text-sm text-slate-500">NGN balances and full transaction history.</p>
        </div>
        {tab === "users" && (
          <input
            placeholder="Search email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-72"
          />
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(["users", "global"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "users" ? "Users by balance" : "All transactions"}
          </button>
        ))}
      </div>

      {tab === "global" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 grid grid-cols-12 gap-3 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <div className="col-span-3">When</div>
            <div className="col-span-3">Customer</div>
            <div className="col-span-2">Type / Source</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2">Reference</div>
          </div>
          {globalTxns.map((t) => (
            <div key={t.id} className="px-5 py-2.5 grid grid-cols-12 gap-3 border-t border-slate-100 text-sm">
              <div className="col-span-3 text-xs text-slate-500">{new Date(t.createdAt).toLocaleString()}</div>
              <div className="col-span-3 text-slate-700 truncate">{t.user?.email || "—"}</div>
              <div className="col-span-2 text-xs text-slate-500">{t.type} · {t.source}</div>
              <div className={`col-span-2 text-right font-bold ${t.type === "CREDIT" ? "text-green-600" : "text-slate-900"}`}>
                {t.type === "CREDIT" ? "+" : "-"}{fmtNgn(t.amountNgn)}
              </div>
              <div className="col-span-2 text-xs text-slate-400 truncate">{t.reference}</div>
            </div>
          ))}
          {globalTxns.length === 0 && !globalLoading && (
            <div className="p-8 text-center text-slate-400">No transactions.</div>
          )}
          {globalLoading && <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>}
          {globalCursor && !globalLoading && (
            <div className="p-3 border-t border-slate-100 text-center">
              <button onClick={() => loadGlobal(globalCursor)}
                className="text-sm text-blue-600 hover:underline font-medium">Load more</button>
            </div>
          )}
        </div>
      )}

      {tab === "users" && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 grid grid-cols-12 gap-3 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <div className="col-span-5">Customer</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-3 text-right">Balance (NGN)</div>
          <div className="col-span-1"></div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No customers.</div>
        ) : filtered.map((u) => (
          <div key={u.id} className="px-5 py-3 grid grid-cols-12 gap-3 border-t border-slate-100 hover:bg-slate-50">
            <div className="col-span-5">
              <p className="font-semibold text-sm text-slate-900">{u.firstName || "—"} {u.lastName || ""}</p>
              <p className="text-xs text-slate-500">{u.email}</p>
            </div>
            <div className="col-span-3 text-sm text-slate-600">{u.role}</div>
            <div className="col-span-3 text-right font-bold text-slate-900">{fmtNgn(u.walletBalanceNgn)}</div>
            <div className="col-span-1 text-right">
              <button onClick={() => openUser(u)} className="text-xs text-blue-600 hover:underline font-medium">View</button>
            </div>
          </div>
        ))}
      </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">{selected.email}</h2>
                <p className="text-xs text-slate-500">Balance: <strong>{fmtNgn(selected.walletBalanceNgn)}</strong></p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {role === "ADMIN" && (
              <div className="border border-slate-200 rounded-lg p-4 mb-4 bg-slate-50">
                <p className="font-semibold text-sm mb-3">Manual adjustment</p>
                <div className="flex gap-2 mb-2">
                  <select value={adjType} onChange={(e) => setAdjType(e.target.value as any)}
                    className="px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="CREDIT">CREDIT</option>
                    <option value="DEBIT">DEBIT</option>
                  </select>
                  <input type="number" min={1} placeholder="Amount NGN"
                    value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded text-sm flex-1" />
                </div>
                <input placeholder="Reason / note (audited)"
                  value={adjDesc} onChange={(e) => setAdjDesc(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm mb-2" />
                {adjErr && <p className="text-xs text-red-600 mb-2">{adjErr}</p>}
                <button onClick={adjust} disabled={busy}
                  className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-700">
                  {busy ? "Applying…" : `Apply ${adjType}`}
                </button>
              </div>
            )}

            <p className="font-semibold text-sm text-slate-900 mb-2">Recent transactions</p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {txns.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No transactions.</div>
              ) : txns.map((t) => (
                <div key={t.id} className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-sm last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{t.description || t.source}</p>
                    <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleString()} · {t.source} · {t.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className={t.type === "CREDIT" ? "font-bold text-green-600" : "font-bold text-slate-900"}>
                      {t.type === "CREDIT" ? "+" : "-"}{fmtNgn(t.amountNgn)}
                    </p>
                    <p className="text-xs text-slate-500">{t.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
