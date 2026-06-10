import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api";

interface DomainRow {
  id: string;
  domainName: string;
  tld: string;
  status: string;
  expiresAt: string;
  locked: boolean;
  privacyOn: boolean;
  autoRenew: boolean;
  nameservers: string[];
  lastSyncedAt: string | null;
  createdAt: string;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null };
}

interface RecentOrder {
  id: string;
  description: string;
  status: string;
  paymentMethod: string;
  ngnAmount: number;
  createdAt: string;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null };
}

interface DynadotStatus {
  ok: boolean;
  data?: { status?: string; expiresAt?: string; locked?: boolean; privacyOn?: boolean; autoRenew?: boolean };
  message?: string;
}

function orderStatusColor(s: string) {
  switch (s) {
    case "FULFILLED": case "COMPLETED": return "bg-green-50 text-green-700";
    case "PAID": return "bg-blue-50 text-blue-700";
    case "PENDING": return "bg-yellow-50 text-yellow-700";
    case "FAILED": return "bg-red-50 text-red-700";
    case "REFUNDED": return "bg-purple-50 text-purple-700";
    default: return "bg-slate-100 text-slate-500";
  }
}

function fmtNgn(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TransfersPage({ role }: { role: "ADMIN" | "CUSTOMER_SERVICE" | "CUSTOMER" }) {
  const api = useApi();
  const [pending, setPending] = useState<DomainRow[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, string>>({});
  const [dynadotStatuses, setDynadotStatuses] = useState<Record<string, DynadotStatus>>({});
  const [tab, setTab] = useState<"pending" | "recent">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api("/api/admin/transfers");
      setPending(r.pending ?? []);
      setRecentOrders((r.recentOrders ?? []).map((o: any) => ({ ...o, ngnAmount: Number(o.ngnAmount) })));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const checkDynadotStatus = async (domainName: string) => {
    setChecking(domainName);
    try {
      const r = await api(`/api/admin/domains/${encodeURIComponent(domainName)}`);
      setDynadotStatuses((prev) => ({ ...prev, [domainName]: r.dynadot }));
    } catch (e: any) {
      setDynadotStatuses((prev) => ({ ...prev, [domainName]: { ok: false, message: e.message } }));
    } finally {
      setChecking(null);
    }
  };

  const forceSync = async (domainName: string) => {
    setSyncing(domainName);
    setSyncResults((prev) => ({ ...prev, [domainName]: "" }));
    try {
      const r = await api(`/api/admin/domains/${encodeURIComponent(domainName)}/sync`, { method: "POST" });
      const newStatus = r.info?.status ?? "unknown";
      setSyncResults((prev) => ({ ...prev, [domainName]: `Synced — Dynadot reports: ${newStatus}` }));
      setDynadotStatuses((prev) => ({
        ...prev,
        [domainName]: { ok: true, data: r.info },
      }));
      await load();
    } catch (e: any) {
      setSyncResults((prev) => ({ ...prev, [domainName]: `Error: ${e.message}` }));
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transfers</h1>
          <p className="text-sm text-slate-500">
            {pending.length} in-progress · {recentOrders.length} completed in last 90 days
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}

      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(["pending", "recent"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"
            }`}>
            {t === "pending" ? `In-progress (${pending.length})` : `Recent completed (${recentOrders.length})`}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 grid grid-cols-12 gap-2 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <div className="col-span-3">Domain</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-3">Dynadot status (last sync)</div>
            <div className="col-span-2">Synced</div>
            <div className="col-span-2">Actions</div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No pending transfers.</div>
          ) : pending.map((d) => {
            const liveStatus = dynadotStatuses[d.domainName];
            return (
              <div key={d.id} className="px-5 py-4 border-t border-slate-100 hover:bg-slate-50">
                <div className="grid grid-cols-12 gap-2 items-start text-sm">
                  <div className="col-span-3">
                    <p className="font-semibold text-slate-900">{d.domainName}</p>
                    <p className="text-xs text-slate-400">.{d.tld}</p>
                    {d.expiresAt && (
                      <p className="text-xs text-slate-400">exp {new Date(d.expiresAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-sm">
                    <p className="text-slate-700 truncate">{d.user?.email || "—"}</p>
                  </div>
                  <div className="col-span-3">
                    {/* Show Dynadot-synced status from DB (reflects last force-sync) */}
                    <div className="flex flex-wrap gap-1 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                        PENDING TRANSFER
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs text-slate-500">
                      {d.locked && <span className="bg-slate-100 px-1.5 py-0.5 rounded">🔒 Locked</span>}
                      {d.privacyOn && <span className="bg-slate-100 px-1.5 py-0.5 rounded">🛡 Privacy</span>}
                      {d.autoRenew && <span className="bg-slate-100 px-1.5 py-0.5 rounded">↻ AutoRenew</span>}
                    </div>
                    {/* Live check result (on demand) */}
                    {liveStatus && (
                      <div className="mt-1">
                        {liveStatus.ok ? (
                          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                            Live: {liveStatus.data?.status ?? "—"}
                          </span>
                        ) : (
                          <span className="text-xs text-red-500">{liveStatus.message}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-xs text-slate-500">
                    <p className="font-medium">{timeAgo(d.lastSyncedAt)}</p>
                    {d.lastSyncedAt && (
                      <p className="text-slate-400">{new Date(d.lastSyncedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    {role === "ADMIN" && (
                      <>
                        <button
                          onClick={() => forceSync(d.domainName)}
                          disabled={syncing === d.domainName}
                          className="text-xs text-blue-600 hover:underline font-medium disabled:opacity-50 text-left"
                        >
                          {syncing === d.domainName ? "Syncing…" : "Force sync"}
                        </button>
                        {checking !== d.domainName && !liveStatus && (
                          <button onClick={() => checkDynadotStatus(d.domainName)}
                            className="text-xs text-slate-500 hover:text-slate-800 text-left">
                            Check live status
                          </button>
                        )}
                        {checking === d.domainName && (
                          <span className="text-xs text-slate-400">Checking…</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {syncResults[d.domainName] && (
                  <p className="mt-2 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
                    {syncResults[d.domainName]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "recent" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 grid grid-cols-12 gap-2 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <div className="col-span-4">Description</div>
            <div className="col-span-3">Customer</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">NGN</div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading…</div>
          ) : recentOrders.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No recent completed transfers.</div>
          ) : recentOrders.map((o) => (
            <div key={o.id} className="px-5 py-3 grid grid-cols-12 gap-2 border-t border-slate-100 hover:bg-slate-50 text-sm items-center">
              <div className="col-span-4">
                <p className="font-medium text-slate-900 truncate">{o.description}</p>
                <p className="text-xs text-slate-400 font-mono">{o.id.slice(0, 16)}…</p>
              </div>
              <div className="col-span-3 text-sm text-slate-700 truncate">{o.user?.email || "—"}</div>
              <div className="col-span-2 text-xs text-slate-500">
                {new Date(o.createdAt).toLocaleDateString()}
              </div>
              <div className="col-span-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${orderStatusColor(o.status)}`}>
                  {o.status}
                </span>
              </div>
              <div className="col-span-1 text-right text-xs font-semibold text-slate-700">
                {fmtNgn(o.ngnAmount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
