import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api";

interface OrderUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Order {
  id: string;
  type: string;
  description: string;
  status: string;
  paymentMethod: string;
  paymentRef: string | null;
  displayCurrency: string;
  displayAmount: number;
  ngnAmount: number;
  amountUsd: number;
  currency: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  user: OrderUser;
}

interface OrderDetail extends Order {
  walletTxns: {
    id: string;
    type: string;
    amountNgn: number;
    balanceAfterNgn: number;
    source: string;
    status: string;
    reference: string | null;
    description: string | null;
    createdAt: string;
  }[];
}

const ORDER_STATUSES = ["PENDING", "PAID", "FULFILLED", "COMPLETED", "FAILED", "REFUNDED"];
const ORDER_TYPES = [
  "DOMAIN_REGISTRATION", "DOMAIN_RENEWAL", "DOMAIN_TRANSFER",
  "DOMAIN_RESTORE", "EMAIL_SUBSCRIPTION", "HOSTING", "ACCOUNT_CREDIT",
];

function statusColor(s: string) {
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

function fmtUsd(n: number) {
  return "$" + Number(n).toFixed(2);
}

export function OrdersPage({ role }: { role: "ADMIN" | "CUSTOMER_SERVICE" | "CUSTOMER" }) {
  const api = useApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundCreditWallet, setRefundCreditWallet] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);

  const buildParams = useCallback((nextCursor?: string) => {
    const p = new URLSearchParams({ limit: "50" });
    if (nextCursor) p.set("cursor", nextCursor);
    if (filterStatus) p.set("status", filterStatus);
    if (filterType) p.set("type", filterType);
    if (filterEmail.trim()) p.set("email", filterEmail.trim());
    if (filterDateFrom) p.set("dateFrom", filterDateFrom);
    if (filterDateTo) p.set("dateTo", filterDateTo);
    return p;
  }, [filterStatus, filterType, filterEmail, filterDateFrom, filterDateTo]);

  const load = useCallback(async (nextCursor?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api(`/api/admin/orders?${buildParams(nextCursor)}`);
      setOrders((prev) => nextCursor ? [...prev, ...r.items] : r.items);
      setTotal(r.total);
      setCursor(r.nextCursor);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, buildParams]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (o: Order) => {
    setSelected(null);
    setActionErr(null);
    setShowRefundForm(false);
    setRefundReason("");
    setRefundCreditWallet(false);
    setDetailLoading(true);
    try {
      const d = await api(`/api/admin/orders/${o.id}`);
      setSelected(d);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const fulfill = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionErr(null);
    try {
      const r = await api(`/api/admin/orders/${selected.id}/fulfill`, { method: "POST" });
      setSelected({ ...selected, status: r.order.status });
      setOrders((prev) => prev.map((o) => o.id === selected.id ? { ...o, status: r.order.status } : o));
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setActionBusy(false);
    }
  };

  const refund = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionErr(null);
    try {
      const r = await api(`/api/admin/orders/${selected.id}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason: refundReason || undefined, creditWallet: refundCreditWallet }),
      });
      setSelected({ ...selected, status: r.order.status });
      setOrders((prev) => prev.map((o) => o.id === selected.id ? { ...o, status: r.order.status } : o));
      setShowRefundForm(false);
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">All customer orders across the registry. Total: {total}</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); load(); }}
        className="mb-4 flex flex-wrap gap-2 items-end"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">All</option>
            {ORDER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Customer email</label>
          <input value={filterEmail} onChange={(e) => setFilterEmail(e.target.value)}
            placeholder="user@example.com"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-52" />
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
          setFilterStatus(""); setFilterType(""); setFilterEmail("");
          setFilterDateFrom(""); setFilterDateTo("");
          setTimeout(() => load(), 0);
        }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg">Clear</button>
      </form>

      {err && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 grid grid-cols-12 gap-2 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <div className="col-span-2">When</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">NGN</div>
          <div className="col-span-1">Payment</div>
          <div className="col-span-1"></div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No orders found.</div>
        ) : orders.map((o) => (
          <div key={o.id} className="px-5 py-3 grid grid-cols-12 gap-2 border-t border-slate-100 hover:bg-slate-50 text-sm items-center">
            <div className="col-span-2 text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</div>
            <div className="col-span-3 truncate">
              <p className="font-medium text-slate-900 truncate">{o.user?.email || "—"}</p>
              <p className="text-xs text-slate-400 truncate">{o.description}</p>
            </div>
            <div className="col-span-2 text-xs text-slate-600">{o.type.replace(/_/g, " ")}</div>
            <div className="col-span-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>
                {o.status}
              </span>
            </div>
            <div className="col-span-1 text-right text-xs font-semibold text-slate-700">{fmtNgn(o.ngnAmount)}</div>
            <div className="col-span-1 text-xs text-slate-500">{o.paymentMethod}</div>
            <div className="col-span-1 text-right">
              <button onClick={() => openDetail(o)}
                className="text-xs text-blue-600 hover:underline font-medium">View</button>
            </div>
          </div>
        ))}

        {cursor && !loading && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button onClick={() => load(cursor)}
              className="text-sm text-blue-600 hover:underline font-medium">Load more</button>
          </div>
        )}
        {loading && orders.length > 0 && (
          <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>
        )}
      </div>

      {(detailLoading) && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 text-slate-500">Loading order…</div>
        </div>
      )}

      {selected && !detailLoading && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">{selected.description}</h2>
                <p className="text-xs text-slate-500 font-mono">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
              {[
                ["Customer", selected.user?.email || "—"],
                ["Type", selected.type.replace(/_/g, " ")],
                ["Status", <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(selected.status)}`}>{selected.status}</span>],
                ["Payment method", selected.paymentMethod],
                ["Payment ref", selected.paymentRef || "—"],
                ["Amount (USD)", fmtUsd(selected.amountUsd)],
                ["Amount (NGN)", fmtNgn(selected.ngnAmount)],
                ["Display", `${selected.displayCurrency} ${selected.displayAmount}`],
                ["Created", new Date(selected.createdAt).toLocaleString()],
                ["Updated", new Date(selected.updatedAt).toLocaleString()],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <dt className="text-xs font-semibold text-slate-500 uppercase">{label}</dt>
                  <dd className="mt-0.5 text-slate-900">{val}</dd>
                </div>
              ))}
            </div>

            {selected.metadata && (
              <details className="mb-4">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 font-medium">Order metadata</summary>
                <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-36 text-slate-700 whitespace-pre-wrap">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </details>
            )}

            {selected.walletTxns.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Wallet transactions</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {selected.walletTxns.map((t) => (
                    <div key={t.id} className="px-4 py-2.5 border-b border-slate-100 last:border-0 flex items-center justify-between text-sm">
                      <div>
                        <p className="text-xs text-slate-500">{t.description || t.source} · {t.reference}</p>
                      </div>
                      <span className={`font-bold text-sm ${t.type === "CREDIT" ? "text-green-600" : "text-slate-900"}`}>
                        {t.type === "CREDIT" ? "+" : "-"}{fmtNgn(t.amountNgn)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {actionErr && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{actionErr}</div>
            )}

            {role === "ADMIN" && (
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                <div className="flex gap-2">
                  {selected.status !== "FULFILLED" && selected.status !== "COMPLETED" && selected.status !== "REFUNDED" && (
                    <button onClick={fulfill} disabled={actionBusy}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {actionBusy ? "Updating…" : "Mark Fulfilled"}
                    </button>
                  )}
                  {selected.status !== "REFUNDED" && (
                    <button onClick={() => setShowRefundForm((v) => !v)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700">
                      Refund…
                    </button>
                  )}
                </div>

                {showRefundForm && (
                  <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 flex flex-col gap-2">
                    <p className="text-sm font-semibold text-purple-900">Confirm refund</p>
                    <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Reason (audited)"
                      className="px-3 py-2 border border-purple-200 rounded text-sm bg-white" />
                    <label className="flex items-center gap-2 text-sm text-purple-900">
                      <input type="checkbox" checked={refundCreditWallet}
                        onChange={(e) => setRefundCreditWallet(e.target.checked)} />
                      Credit {fmtNgn(selected.ngnAmount)} back to customer wallet
                    </label>
                    <button onClick={refund} disabled={actionBusy}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 self-start">
                      {actionBusy ? "Processing…" : "Confirm Refund"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
