import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api";

interface AdminUser {
  id: string;
  clerkId: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "ADMIN" | "CUSTOMER_SERVICE" | "CUSTOMER";
  walletBalanceNgn?: number;
  createdAt: string;
  _count: { domains: number; orders: number };
}

interface UserDomain {
  id: string;
  domainName: string;
  status: string;
  expiresAt: string;
}

interface UserOrder {
  id: string;
  type: string;
  description: string;
  status: string;
  ngnAmount: number;
  createdAt: string;
}

function fmtNgn(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function domainStatusColor(s: string) {
  switch (s) {
    case "ACTIVE": return "bg-green-50 text-green-700";
    case "EXPIRED": return "bg-red-50 text-red-700";
    case "PENDING_TRANSFER": return "bg-yellow-50 text-yellow-700";
    default: return "bg-slate-100 text-slate-500";
  }
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

export function UsersPage({ role }: { role: string }) {
  const api = useApi();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [viewTab, setViewTab] = useState<"domains" | "orders" | "wallet">("domains");
  const [viewDomains, setViewDomains] = useState<UserDomain[]>([]);
  const [viewOrders, setViewOrders] = useState<UserOrder[]>([]);
  const [viewWallet, setViewWallet] = useState<{ user: { walletBalanceNgn: number; id: string; email: string }; transactions: any[] } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewErr, setViewErr] = useState<string | null>(null);

  const [adjType, setAdjType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);
  const [adjErr, setAdjErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((data) => { setUsers(data); setErr(null); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [api, q]);

  useEffect(() => { load(); }, []);

  const openUser = async (u: AdminUser) => {
    setViewUser(u);
    setViewTab("domains");
    setViewDomains([]);
    setViewOrders([]);
    setViewWallet(null);
    setViewErr(null);
    setAdjErr(null);
    setAdjAmount("");
    setAdjDesc("");
    setViewLoading(true);
    try {
      const [domainsRes, ordersRes] = await Promise.all([
        api(`/api/admin/domains?userId=${u.id}&limit=50`),
        api(`/api/admin/orders?userId=${u.id}&limit=50`),
      ]);
      setViewDomains(domainsRes.items || []);
      setViewOrders((ordersRes.items || []).map((o: any) => ({
        ...o,
        ngnAmount: Number(o.ngnAmount),
      })));
    } catch (e: any) {
      setViewErr(e.message);
    } finally {
      setViewLoading(false);
    }
  };

  const loadWallet = async () => {
    if (!viewUser || viewWallet) return;
    setViewLoading(true);
    try {
      const w = await api(`/api/admin/users/${viewUser.id}/wallet`);
      setViewWallet(w);
    } catch (e: any) {
      setViewErr(e.message);
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => {
    if (viewTab === "wallet") loadWallet();
  }, [viewTab]);

  const adjust = async () => {
    if (!viewUser) return;
    setAdjBusy(true);
    setAdjErr(null);
    try {
      const amt = Number(adjAmount);
      if (!amt || amt <= 0) throw new Error("Amount must be > 0");
      const endpoint = adjType === "CREDIT"
        ? `/api/admin/users/${viewUser.id}/wallet/credit`
        : `/api/admin/users/${viewUser.id}/wallet/debit`;
      const r = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({ amountNgn: amt, description: adjDesc || undefined }),
      });
      setAdjAmount("");
      setAdjDesc("");
      const newBalance = Number(r.newBalanceNgn);
      setViewWallet((prev) => prev ? { ...prev, walletBalanceNgn: newBalance } : null);
      setViewUser((prev) => prev ? { ...prev, walletBalanceNgn: newBalance } : prev);
      setUsers((prev) => prev.map((u) => u.id === viewUser.id ? { ...u, walletBalanceNgn: newBalance } : u));
      setViewWallet(null);
      loadWallet();
    } catch (e: any) {
      setAdjErr(e.message);
    } finally {
      setAdjBusy(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold mb-1">Users</h2>
      <p className="text-slate-500 text-sm mb-6">
        {role === "ADMIN" ? "View and manage registered users." : "Read-only view of registered users."}
      </p>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email or username…"
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-80"
        />
        <button className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg">Search</button>
      </form>

      {err && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{err}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-right">Domains</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-500">No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.email || "—"}</td>
                <td className="px-4 py-3">{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    u.role === "ADMIN" ? "bg-purple-100 text-purple-700"
                    : u.role === "CUSTOMER_SERVICE" ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
                  {u.walletBalanceNgn !== undefined ? fmtNgn(Number(u.walletBalanceNgn)) : "—"}
                </td>
                <td className="px-4 py-3 text-right">{u._count.domains}</td>
                <td className="px-4 py-3 text-right">{u._count.orders}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openUser(u)}
                    className="text-xs text-blue-600 hover:underline font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewUser && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewUser(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">{viewUser.email}</h2>
                <p className="text-xs text-slate-500">
                  {[viewUser.firstName, viewUser.lastName].filter(Boolean).join(" ") || viewUser.username || "No name"}
                  {" · "}
                  <span className={`font-semibold ${viewUser.role === "ADMIN" ? "text-purple-600" : viewUser.role === "CUSTOMER_SERVICE" ? "text-blue-600" : "text-slate-500"}`}>
                    {viewUser.role}
                  </span>
                </p>
              </div>
              <button onClick={() => setViewUser(null)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            <div className="flex gap-1 mb-4 border-b border-slate-200">
              {(["domains", "orders", "wallet"] as const).map((t) => (
                <button key={t} onClick={() => setViewTab(t)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px capitalize ${
                    viewTab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}>
                  {t}
                  {t === "domains" && viewDomains.length > 0 && ` (${viewDomains.length})`}
                  {t === "orders" && viewOrders.length > 0 && ` (${viewOrders.length})`}
                </button>
              ))}
            </div>

            {viewErr && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{viewErr}</div>}
            {viewLoading && <div className="py-8 text-center text-slate-400">Loading…</div>}

            {!viewLoading && viewTab === "domains" && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {viewDomains.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No domains.</div>
                ) : viewDomains.map((d) => (
                  <div key={d.id} className="px-4 py-3 border-b border-slate-100 last:border-0 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{d.domainName}</p>
                      <p className="text-xs text-slate-400">
                        {d.expiresAt ? `Expires ${new Date(d.expiresAt).toLocaleDateString()}` : "No expiry"}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${domainStatusColor(d.status)}`}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!viewLoading && viewTab === "orders" && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {viewOrders.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No orders.</div>
                ) : viewOrders.map((o) => (
                  <div key={o.id} className="px-4 py-3 border-b border-slate-100 last:border-0 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{o.description}</p>
                      <p className="text-xs text-slate-400">
                        {o.type.replace(/_/g, " ")} · {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${orderStatusColor(o.status)}`}>
                        {o.status}
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">{fmtNgn(o.ngnAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!viewLoading && viewTab === "wallet" && (
              <div>
                <div className="flex items-center justify-between mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Wallet balance</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {viewWallet ? fmtNgn(viewWallet.user.walletBalanceNgn) : viewUser.walletBalanceNgn !== undefined ? fmtNgn(Number(viewUser.walletBalanceNgn)) : "—"}
                    </p>
                  </div>
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
                    <button onClick={adjust} disabled={adjBusy}
                      className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-700 disabled:opacity-50">
                      {adjBusy ? "Applying…" : `Apply ${adjType}`}
                    </button>
                  </div>
                )}

                {viewWallet && viewWallet.transactions.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm text-slate-900 mb-2">Recent transactions</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      {viewWallet.transactions.map((t: any) => (
                        <div key={t.id} className="px-4 py-3 border-b border-slate-100 last:border-0 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium text-slate-900">{t.description || t.source}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(t.createdAt).toLocaleString()} · {t.source} · {t.reference}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={t.type === "CREDIT" ? "font-bold text-green-600" : "font-bold text-slate-900"}>
                              {t.type === "CREDIT" ? "+" : "-"}{fmtNgn(t.amountNgn)}
                            </p>
                            <p className="text-xs text-slate-400">{t.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewWallet && viewWallet.transactions.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-sm border border-slate-200 rounded-lg">No transactions yet.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
