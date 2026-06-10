import { useEffect, useState, useCallback, useRef } from "react";
import { useApi } from "../api";

interface DomainRow {
  id: string;
  domainName: string;
  tld: string;
  status: string;
  expiresAt: string;
  autoRenew: boolean;
  locked: boolean;
  privacyOn: boolean;
  nameservers: string[];
  lastSyncedAt: string | null;
  createdAt: string;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null };
}

function statusColor(s: string) {
  switch (s) {
    case "ACTIVE": return "bg-green-50 text-green-700";
    case "EXPIRED": return "bg-red-50 text-red-700";
    case "PENDING_TRANSFER": return "bg-yellow-50 text-yellow-700";
    case "SUSPENDED": return "bg-orange-50 text-orange-700";
    case "CANCELLED": return "bg-gray-100 text-gray-500";
    default: return "bg-slate-100 text-slate-500";
  }
}

interface DynadotDetail {
  db: DomainRow | null;
  dynadot: { ok: boolean; data?: any; message?: string };
}

export function DomainsPage({ role }: { role: "ADMIN" | "CUSTOMER_SERVICE" | "CUSTOMER" }) {
  const api = useApi();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<DomainRow | null>(null);
  const [detail, setDetail] = useState<DynadotDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const detailRef = useRef<string | null>(null);

  const load = useCallback(async (nextCursor?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (nextCursor) params.set("cursor", nextCursor);
      if (search.trim()) params.set("search", search.trim());
      const r = await api(`/api/admin/domains?${params}`);
      setDomains((prev) => nextCursor ? [...prev, ...r.items] : r.items);
      setHasMore(!!r.nextCursor);
      setCursor(r.nextCursor);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = useCallback(async (domain: DomainRow) => {
    setSelected(domain);
    setDetail(null);
    // CUSTOMER_SERVICE cannot call the ADMIN-only detail endpoint — show DB data only
    if (role !== "ADMIN") { setDetailLoading(false); return; }
    setDetailLoading(true);
    detailRef.current = domain.domainName;
    try {
      const d = await api(`/api/admin/domains/${encodeURIComponent(domain.domainName)}`);
      if (detailRef.current === domain.domainName) setDetail(d);
    } catch (e: any) {
      if (detailRef.current === domain.domainName) setDetail({ db: null, dynadot: { ok: false, message: e.message } });
    } finally {
      if (detailRef.current === domain.domainName) setDetailLoading(false);
    }
  }, [api, role]);

  const forceSyncDomain = async (domainName: string) => {
    setSyncing(domainName);
    try {
      await api(`/api/admin/domains/${encodeURIComponent(domainName)}/sync`, { method: "POST" });
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Domains</h1>
          <p className="text-sm text-slate-500">All registered and transferred domains across all customers.</p>
        </div>
        <input
          placeholder="Search domain…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64"
        />
      </div>

      {err && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 grid grid-cols-12 gap-2 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <div className="col-span-4">Domain</div>
          <div className="col-span-2">Customer</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Expires</div>
          <div className="col-span-2">Actions</div>
        </div>

        {loading && domains.length === 0 ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : domains.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No domains found.</div>
        ) : domains.map((d) => (
          <div key={d.id} className="px-5 py-3 grid grid-cols-12 gap-2 border-t border-slate-100 hover:bg-slate-50 text-sm items-center">
            <div className="col-span-4">
              <p className="font-semibold text-slate-900">{d.domainName}</p>
              <p className="text-xs text-slate-400">{d.nameservers.slice(0, 2).join(", ") || "no nameservers"}</p>
            </div>
            <div className="col-span-2 text-xs text-slate-500 truncate">{d.user?.email || "—"}</div>
            <div className="col-span-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(d.status)}`}>
                {d.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="col-span-2 text-xs text-slate-600">
              {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : "—"}
            </div>
            <div className="col-span-2 flex gap-2">
              <button onClick={() => openDetail(d)} className="text-xs text-blue-600 hover:underline font-medium">View</button>
              {role === "ADMIN" && (
                <button
                  onClick={() => forceSyncDomain(d.domainName)}
                  disabled={syncing === d.domainName}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  {syncing === d.domainName ? "Syncing…" : "Sync"}
                </button>
              )}
            </div>
          </div>
        ))}

        {hasMore && !loading && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button onClick={() => load(cursor ?? undefined)} className="text-sm text-blue-600 hover:underline font-medium">Load more</button>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => { setSelected(null); detailRef.current = null; }}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">{selected.domainName}</h2>
                <p className="text-xs text-slate-500">Customer: {selected.user?.email || "unknown"}</p>
              </div>
              <button onClick={() => { setSelected(null); detailRef.current = null; }} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            {/* DB record */}
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Database record</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Status", <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(selected.status)}`}>{selected.status.replace(/_/g, " ")}</span>],
                  ["TLD", selected.tld],
                  ["Expires", selected.expiresAt ? new Date(selected.expiresAt).toLocaleDateString() : "—"],
                  ["Auto-renew", selected.autoRenew ? "Yes" : "No"],
                  ["Locked", selected.locked ? "Yes" : "No"],
                  ["Privacy", selected.privacyOn ? "On" : "Off"],
                  ["Last synced", selected.lastSyncedAt ? new Date(selected.lastSyncedAt).toLocaleString() : "Never"],
                  ["Registered", new Date(selected.createdAt).toLocaleDateString()],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <dt className="text-xs font-semibold text-slate-500 uppercase">{label}</dt>
                    <dd className="mt-0.5 text-slate-900">{val}</dd>
                  </div>
                ))}
              </dl>
              {selected.nameservers.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Nameservers</p>
                  <ul className="text-sm text-slate-700 space-y-0.5">
                    {selected.nameservers.map((ns) => <li key={ns} className="font-mono text-xs">{ns}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Live Dynadot status */}
            <div className="border-t border-slate-100 pt-4 mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Live Dynadot status</p>
              {detailLoading ? (
                <p className="text-sm text-slate-400">Fetching from Dynadot…</p>
              ) : !detail ? (
                <p className="text-sm text-slate-400">No data fetched.</p>
              ) : !detail.dynadot.ok ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <strong>Dynadot error:</strong> {detail.dynadot.message ?? "Unknown error"}
                </div>
              ) : (
                <div>
                  {detail.dynadot.data && (
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                      {[
                        ["Status", detail.dynadot.data.status ?? "—"],
                        ["Expires", detail.dynadot.data.expiresAt ? new Date(detail.dynadot.data.expiresAt).toLocaleDateString() : "—"],
                        ["Locked", detail.dynadot.data.locked !== undefined ? (detail.dynadot.data.locked ? "Yes" : "No") : "—"],
                        ["Privacy", detail.dynadot.data.privacyOn !== undefined ? (detail.dynadot.data.privacyOn ? "On" : "Off") : "—"],
                        ["Auto-renew", detail.dynadot.data.autoRenew !== undefined ? (detail.dynadot.data.autoRenew ? "Yes" : "No") : "—"],
                      ].map(([label, val]) => (
                        <div key={String(label)}>
                          <dt className="text-xs font-semibold text-slate-500 uppercase">{label}</dt>
                          <dd className="mt-0.5 text-slate-700">{String(val)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {detail.dynadot.data?.nameservers?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Dynadot Nameservers</p>
                      <ul className="text-xs font-mono text-slate-700 space-y-0.5">
                        {detail.dynadot.data.nameservers.map((ns: string) => <li key={ns}>{ns}</li>)}
                      </ul>
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Show raw Dynadot response</summary>
                    <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-48 text-slate-700 whitespace-pre-wrap">
                      {JSON.stringify(detail.dynadot.data?.raw ?? detail.dynadot.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>

            {role === "ADMIN" && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={async () => { await forceSyncDomain(selected.domainName); await openDetail(selected); }}
                  disabled={syncing === selected.domainName}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700"
                >
                  {syncing === selected.domainName ? "Syncing…" : "Force sync from Dynadot"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
