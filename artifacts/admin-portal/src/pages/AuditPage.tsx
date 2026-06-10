import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api";

interface Log {
  id: string;
  actorClerkId: string;
  actorEmail: string | null;
  action: string;
  target: string | null;
  metadata: any;
  createdAt: string;
}

function humanDescription(l: Log): string {
  const m = l.metadata ?? {};
  const tgt = l.target || "";
  switch (true) {
    case l.action === "tld.sync":
      return `Synced TLDs from Dynadot — ${m.added ?? 0} added, ${m.updated ?? 0} updated, ${m.removed ?? 0} removed (${m.total ?? 0} total)`;
    case l.action === "tld.price.update":
      return `Updated retail pricing for .${tgt}`;
    case l.action === "currency.upsert":
      return `Added/updated currency ${tgt}`;
    case l.action === "currency.update":
      return `Updated exchange rate for ${tgt}${m.rate !== undefined ? ` → ${m.rate}` : ""}${m.enabled !== undefined ? ` (${m.enabled ? "enabled" : "disabled"})` : ""}`;
    case l.action === "currency.delete":
      return `Deleted currency ${tgt}`;
    case l.action.startsWith("domain.admin.lock"):
      return `Locked domain ${tgt}`;
    case l.action.startsWith("domain.admin.unlock"):
      return `Unlocked domain ${tgt}`;
    case l.action.startsWith("domain.admin.setPrivacy"):
      return `${m.params?.on ? "Enabled" : "Disabled"} privacy for ${tgt}`;
    case l.action.startsWith("domain.admin.setNameservers"):
      return `Updated nameservers for ${tgt}`;
    case l.action.startsWith("domain.admin.deleteTransfer"):
      return `Cancelled pending transfer for ${tgt}`;
    case l.action.startsWith("domain.admin."):
      return `Domain action '${l.action.replace("domain.admin.", "")}' on ${tgt}`;
    case l.action === "domain.sync":
      return `Force-synced ${tgt} from Dynadot${m.info?.status ? ` — status: ${m.info.status}` : ""}`;
    case l.action === "wallet.adjust":
      return `${m.type === "DEBIT" ? "Debited" : "Credited"} wallet of ${tgt} by ₦${Number(m.amountNgn ?? 0).toLocaleString()}${m.description ? ` — "${m.description}"` : ""}`;
    case l.action === "order.fulfill":
      return `Marked order ${tgt} as FULFILLED (was ${m.prevStatus})`;
    case l.action === "order.refund":
      return `Refunded order ${tgt}${m.creditWallet ? ` (₦${Number(m.ngnAmount ?? 0).toLocaleString()} credited to wallet)` : ""}${m.reason ? ` — "${m.reason}"` : ""}`;
    default:
      return l.action;
  }
}

function actionCategory(action: string): string {
  if (action.startsWith("tld.")) return "TLD";
  if (action.startsWith("currency.")) return "Currency";
  if (action.startsWith("domain.")) return "Domain";
  if (action.startsWith("wallet.")) return "Wallet";
  if (action.startsWith("order.")) return "Order";
  return "Other";
}

function categoryColor(cat: string) {
  switch (cat) {
    case "TLD": return "bg-blue-50 text-blue-700";
    case "Currency": return "bg-yellow-50 text-yellow-700";
    case "Domain": return "bg-green-50 text-green-700";
    case "Wallet": return "bg-emerald-50 text-emerald-700";
    case "Order": return "bg-purple-50 text-purple-700";
    default: return "bg-slate-100 text-slate-500";
  }
}

export function AuditPage() {
  const api = useApi();
  const [logs, setLogs] = useState<Log[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [filterActor, setFilterActor] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const buildParams = useCallback((cursor?: string) => {
    const p = new URLSearchParams({ limit: "200" });
    if (cursor) p.set("cursor", cursor);
    if (filterActor.trim()) p.set("actor", filterActor.trim());
    if (filterAction.trim()) p.set("action", filterAction.trim());
    if (filterTarget.trim()) p.set("target", filterTarget.trim());
    if (filterDateFrom) p.set("dateFrom", filterDateFrom);
    if (filterDateTo) p.set("dateTo", filterDateTo);
    return p;
  }, [filterActor, filterAction, filterTarget, filterDateFrom, filterDateTo]);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api(`/api/admin/audit?${buildParams(cursor)}`);
      const items: Log[] = Array.isArray(r) ? r : (r.items ?? []);
      setLogs((prev) => cursor ? [...prev, ...items] : items);
      setNextCursor(r.nextCursor ?? null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, buildParams]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold mb-1">Audit log</h2>
      <p className="text-slate-500 text-sm mb-4">Complete record of all administrative actions.</p>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mb-4 flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Actor email</label>
          <input value={filterActor} onChange={(e) => setFilterActor(e.target.value)}
            placeholder="admin@example.com"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-52" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Action contains</label>
          <input value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
            placeholder="e.g. domain, wallet, tld"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Target</label>
          <input value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)}
            placeholder="e.g. example.com or user@…"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">From</label>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">To</label>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <button className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg">Filter</button>
        <button type="button" onClick={() => {
          setFilterActor(""); setFilterAction(""); setFilterTarget(""); setFilterDateFrom(""); setFilterDateTo("");
          setTimeout(() => load(), 0);
        }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg">Clear</button>
      </form>

      {err && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{err}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left w-36">When</th>
              <th className="px-4 py-3 text-left w-44">Actor</th>
              <th className="px-4 py-3 text-left w-20">Category</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left w-32">Target</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No log entries found.</td></tr>
            ) : logs.map((l) => {
              const cat = actionCategory(l.action);
              return (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm truncate max-w-[176px]">
                    {l.actorEmail || l.actorClerkId.slice(0, 16) + "…"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColor(cat)}`}>
                      {cat}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{humanDescription(l)}</p>
                    <details>
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 mt-0.5 inline">Raw</summary>
                      <code className="text-xs text-slate-500 block mt-1 whitespace-pre-wrap max-w-md">
                        {l.action}{l.metadata ? " — " + JSON.stringify(l.metadata) : ""}
                      </code>
                    </details>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[128px]">{l.target || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {nextCursor && !loading && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button onClick={() => load(nextCursor)}
              className="text-sm text-blue-600 hover:underline font-medium">Load more</button>
          </div>
        )}
        {loading && logs.length > 0 && (
          <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>
        )}
      </div>
    </div>
  );
}
