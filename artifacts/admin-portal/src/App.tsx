import { ClerkProvider, SignIn, UserButton, useUser } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useApi } from "./api";
import { TldsPage } from "./pages/TldsPage";
import { CurrenciesPage } from "./pages/CurrenciesPage";
import { UsersPage } from "./pages/UsersPage";
import { WalletsPage } from "./pages/WalletsPage";
import { DomainsPage } from "./pages/DomainsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { TransfersPage } from "./pages/TransfersPage";
import { AuditPage } from "./pages/AuditPage";
import { Dashboard } from "./pages/Dashboard";

import { BlogsPage } from "./pages/BlogsPage";

const queryClient = new QueryClient();
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

interface Me { clerkId: string; email: string; role: "ADMIN" | "CUSTOMER_SERVICE" | "CUSTOMER" }

function Shell() {
  const api = useApi();
  const { isLoaded, isSignedIn } = useUser();
  const [me, setMe] = useState<Me | null>(null);
  const [meErr, setMeErr] = useState<string | null>(null);
  const [loc] = useLocation();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    api("/api/admin/me")
      .then((d) => { setMe(d); setMeErr(null); })
      .catch((e) => setMeErr(e.message));
  }, [api, isLoaded, isSignedIn]);

  if (!isLoaded) return <CenterMsg>Loading…</CenterMsg>;

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Drave Admin Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in with your administrator account.</p>
        </div>
        <SignIn routing="hash" />
      </div>
    );
  }

  return (
    <>
      {meErr ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Access denied</h1>
          <p className="text-slate-600 max-w-md">{meErr}</p>
          <p className="text-slate-500 text-sm mt-4">
            You must have an ADMIN or CUSTOMER_SERVICE role to access this portal.
          </p>
          <div className="mt-6"><UserButton /></div>
        </div>
      ) : !me ? (
        <CenterMsg>Loading account…</CenterMsg>
      ) : (
          <div className="min-h-screen grid grid-cols-[240px_1fr]">
            <aside className="bg-slate-900 text-slate-100 p-6 flex flex-col">
              <div className="mb-8">
                <h1 className="text-lg font-bold">Drave Admin</h1>
                <p className="text-xs text-slate-400 mt-0.5">{me.role}</p>
              </div>
              <nav className="flex flex-col gap-1 text-sm flex-1">
                <NavItem href="/" active={loc === "/"}>Dashboard</NavItem>
                <NavItem href="/blogs" active={loc.startsWith("/blogs")}>Blogs &amp; KB</NavItem>
                <NavItem href="/tlds" active={loc.startsWith("/tlds")}>TLDs &amp; pricing</NavItem>
                <NavItem href="/currencies" active={loc.startsWith("/currencies")}>Currencies</NavItem>
                <NavItem href="/users" active={loc.startsWith("/users")}>Users</NavItem>
                <NavItem href="/wallets" active={loc.startsWith("/wallets")}>Wallets</NavItem>
                <NavItem href="/domains" active={loc.startsWith("/domains")}>Domains</NavItem>
                <NavItem href="/orders" active={loc.startsWith("/orders")}>Orders</NavItem>
                <NavItem href="/transfers" active={loc.startsWith("/transfers")}>Transfers</NavItem>
                {me.role === "ADMIN" && (
                  <NavItem href="/audit" active={loc.startsWith("/audit")}>Audit log</NavItem>
                )}
              </nav>
              <div className="mt-auto pt-6 border-t border-slate-700/60 flex items-center gap-3">
                <UserButton />
                <div className="text-xs">
                  <div className="font-semibold truncate max-w-[140px]">{me.email}</div>
                </div>
              </div>
            </aside>
            <main className="p-8 overflow-auto">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/blogs"><BlogsPage /></Route>
                <Route path="/tlds"><TldsPage role={me.role} /></Route>
                <Route path="/currencies"><CurrenciesPage role={me.role} /></Route>
                <Route path="/users"><UsersPage role={me.role} /></Route>
                <Route path="/wallets"><WalletsPage role={me.role} /></Route>
                <Route path="/domains"><DomainsPage role={me.role} /></Route>
                <Route path="/orders"><OrdersPage role={me.role} /></Route>
                <Route path="/transfers"><TransfersPage role={me.role} /></Route>
                <Route path="/audit">{me.role === "ADMIN" ? <AuditPage /> : <Forbidden />}</Route>
                <Route><div className="text-slate-500">Page not found.</div></Route>
              </Switch>
            </main>
          </div>
        )}
    </>
  );
}

function NavItem({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href}>
      <a
        className={`block px-3 py-2 rounded-lg transition-colors ${
          active ? "bg-blue-500/20 text-white" : "text-slate-300 hover:bg-slate-800"
        }`}
      >
        {children}
      </a>
    </Link>
  );
}

function CenterMsg({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center text-slate-500">{children}</div>;
}

function Forbidden() {
  return <div className="text-red-600 font-semibold">Forbidden — admin only.</div>;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <Shell />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
