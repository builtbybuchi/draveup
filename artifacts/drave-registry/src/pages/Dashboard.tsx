import { useAuth } from '@/context/AuthContext';
import { useLocation, Link } from 'wouter';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/context/CurrencyContext';
import { Header } from '@/components/layout/Header';
import { LoginModal } from '@/components/auth/LoginModal';
import { CartDrawer } from '@/components/layout/CartDrawer';
import {
  LayoutDashboard, Globe, Mail, Search, CreditCard, Shield, User,
  AlertCircle, Plus, RefreshCw, ArrowRight, Lock, Unlock,
  Eye, EyeOff, Key, Server, Trash2, Edit2, X, ChevronDown, ChevronUp,
  BookUser, ReceiptText, Wallet, Star, Info, Contact,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMyDomains, useLockDomain, usePrivacyDomain, useSetNameservers, useSyncDomains, type MyDomain } from '@/hooks/useMyDomains';
import { useMyOrders, type MyOrder } from '@/hooks/useMyOrders';
import { useMyContacts, useCreateContact, useUpdateContact, useDeleteContact, type MyContact, type ContactInput } from '@/hooks/useMyContacts';
import { useWalletBalance, useWalletTransactions } from '@/hooks/useWalletData';
import { useTlds } from '@/hooks/useTlds';
import { apiUrl } from '@/lib/api';

type SidebarSection = 'dashboard' | 'domains' | 'transfers' | 'orders' | 'wallet' | 'contacts' | 'emails' | 'whois' | 'security' | 'profile';

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-600',
    EXPIRED: 'bg-red-50 text-red-600',
    PENDING_TRANSFER: 'bg-orange-50 text-orange-600',
    SUSPENDED: 'bg-yellow-50 text-yellow-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    PAID: 'bg-green-50 text-green-600',
    FULFILLED: 'bg-blue-50 text-blue-600',
    PENDING: 'bg-orange-50 text-orange-600',
    FAILED: 'bg-red-50 text-red-600',
    SUCCESS: 'bg-green-50 text-green-600',
    DEBIT: 'bg-red-50 text-red-500',
    CREDIT: 'bg-green-50 text-green-600',
  };
  const label: Record<string, string> = { PENDING_TRANSFER: 'Transferring' };
  return (
    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', map[status] ?? 'bg-gray-100 text-gray-500')}>
      {label[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-100 rounded', className)} />;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { t } = useTranslation(['dashboard']);
  const { formatPrice } = useCurrency();
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard');
  const { data: walletData } = useWalletBalance();

  useEffect(() => {
    if (!isAuthenticated) { openLoginModal('/dashboard'); setLocation('/'); }
  }, [isAuthenticated, openLoginModal, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('wallet') || params.has('reference')) setActiveSection('wallet');
    else if (params.has('order')) setActiveSection('orders');
  }, []);

  if (!user) return null;

  const sidebarItems: { id: SidebarSection; icon: any; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.overview') },
    { id: 'domains', icon: Globe, label: t('sidebar.myDomains') },
    { id: 'transfers', icon: RefreshCw, label: t('sidebar.transfers') },
    { id: 'orders', icon: ReceiptText, label: t('sidebar.orders') },
    { id: 'wallet', icon: Wallet, label: t('sidebar.wallet') },
    { id: 'contacts', icon: BookUser, label: t('sidebar.contacts') },
    { id: 'emails', icon: Mail, label: t('sidebar.emailPlans') },
    { id: 'whois', icon: Search, label: t('sidebar.whoisLookup') },
    { id: 'security', icon: Shield, label: t('sidebar.security') },
    { id: 'profile', icon: User, label: t('sidebar.profile') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <LoginModal />
      <CartDrawer />
      <div className="flex pt-16 min-h-screen">
        <aside className="w-56 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 flex flex-col overflow-y-auto z-30">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt={`${user.firstName} ${user.lastName}`} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 bg-[#0A91F9] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {(user.firstName || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{user.username}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {sidebarItems.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left',
                  activeSection === id ? 'bg-blue-50 text-[#0A91F9] font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}>
                <Icon className={cn('w-4 h-4 flex-shrink-0', activeSection === id ? 'text-[#0A91F9]' : 'text-gray-400')} />
                {label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-100">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Wallet</p>
              <p className="text-xl font-bold text-[#0A91F9]">
                {walletData ? formatPrice(walletData.balanceUsd) : '…'}
              </p>
              <button onClick={() => setActiveSection('wallet')} className="text-xs text-[#0A91F9] hover:underline mt-1 font-medium">Top Up →</button>
            </div>
          </div>
        </aside>
        <main className="flex-1 ml-56 px-6 py-8 max-w-full overflow-x-hidden">
          {activeSection === 'dashboard' && <DashboardHome t={t} user={user} setActiveSection={setActiveSection} />}
          {activeSection === 'domains' && <DomainList />}
          {activeSection === 'transfers' && <TransferList />}
          {activeSection === 'orders' && <OrderList />}
          {activeSection === 'wallet' && <WalletSection />}
          {activeSection === 'contacts' && <ContactsSection />}
          {activeSection === 'emails' && <EmailList />}
          {activeSection === 'whois' && <WhoisSection />}
          {activeSection === 'security' && <SecuritySection user={user} />}
          {activeSection === 'profile' && <ProfileSection user={user} />}
        </main>
      </div>
    </div>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────

function DashboardHome({ t, user, setActiveSection }: { t: any; user: any; setActiveSection: (s: SidebarSection) => void }) {
  const { formatPrice } = useCurrency();
  const { data: domains, isLoading: domsLoading } = useMyDomains();
  const { data: walletData } = useWalletBalance();
  const activeDomains = domains?.filter(d => d.status === 'ACTIVE').length ?? 0;
  const pendingTransfers = domains?.filter(d => d.status === 'PENDING_TRANSFER').length ?? 0;
  const nextRenewal = domains
    ?.filter(d => d.status === 'ACTIVE' && d.expiresAt)
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];
  const balNgn = walletData ? Number(walletData.balanceUsd) : null;

  const stats = [
    { label: t('overview.activeDomains'), value: domsLoading ? null : String(activeDomains), icon: Globe, color: 'blue', click: () => setActiveSection('domains') },
    { label: t('overview.pendingTransfers'), value: domsLoading ? null : String(pendingTransfers), icon: RefreshCw, color: 'orange', click: () => setActiveSection('transfers') },
    { label: t('overview.nextRenewal'), value: domsLoading ? null : (nextRenewal ? fmtDate(nextRenewal.expiresAt) : t('overview.none')), icon: AlertCircle, color: 'yellow', click: () => setActiveSection('domains') },
    { label: t('overview.walletBalance'), value: balNgn === null ? null : formatPrice(balNgn), icon: CreditCard, color: 'purple', click: () => setActiveSection('wallet') },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hello, {user.firstName} {user.lastName}</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back to your dashboard.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, click }) => (
          <button key={label} onClick={click}
            className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-[#0A91F9] hover:shadow-md transition-all">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3',
              color === 'blue' ? 'bg-blue-50' : color === 'orange' ? 'bg-orange-50' : color === 'yellow' ? 'bg-yellow-50' : 'bg-purple-50')}>
              <Icon className={cn('w-5 h-5', color === 'blue' ? 'text-blue-500' : color === 'orange' ? 'text-orange-500' : color === 'yellow' ? 'text-yellow-500' : 'text-purple-500')} />
            </div>
            {value === null ? <Skeleton className="h-8 w-20 mb-1" /> : <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>}
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">My Domains</h2>
          <button onClick={() => setActiveSection('domains')} className="text-sm text-[#0A91F9] hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {domsLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (domains?.length ?? 0) === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            <Globe className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            You don't have any domains yet — <Link href="/domains" className="text-[#0A91F9] hover:underline">search for one</Link>.
          </div>
        ) : domains!.slice(0, 5).map(d => (
          <div key={d.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 border-t border-gray-50 first:border-0 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-[#0A91F9]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{d.domainName}</p>
                <p className="text-xs text-gray-500">Expires {fmtDate(d.expiresAt)}</p>
              </div>
            </div>
            <StatusBadge status={d.status} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Plus, label: 'Register New Domain', desc: 'Find and register your perfect domain', href: '/domains', color: '#0A91F9' },
          { icon: RefreshCw, label: 'Transfer a Domain', desc: 'Move your domain to DraveUp', href: '/transfer', color: '#10b981' },
          { icon: Mail, label: 'Add Email Plan', desc: 'Get professional email for your domain', href: '/email', color: '#8b5cf6' },
        ].map(({ icon: Icon, label, desc, href, color }) => (
          <Link key={href} href={href} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4 hover:border-[#0A91F9] hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '15' }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── DOMAIN LIST ──────────────────────────────────────────────────────────────

interface ManageState {
  domain: MyDomain;
  tab: 'details' | 'contacts' | 'renew';
}

function DomainList() {
  const { formatPrice } = useCurrency();
  const { data: domains, isLoading, isError } = useMyDomains();
  const { data: contacts } = useMyContacts();
  const { data: tlds } = useTlds();
  const lockMut = useLockDomain();
  const privacyMut = usePrivacyDomain();
  const syncMut = useSyncDomains();
  const nsMut = useSetNameservers();

  const [manage, setManage] = useState<ManageState | null>(null);
  const [nsEdit, setNsEdit] = useState(false);
  const [nsValue, setNsValue] = useState('');
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  // Renew state
  const [renewYears, setRenewYears] = useState(1);
  const [renewMethod, setRenewMethod] = useState<'WALLET' | 'PAYSTACK'>('WALLET');
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewMsg, setRenewMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Domain contacts state
  const [contactLoading, setContactLoading] = useState(false);
  const [domainContact, setDomainContact] = useState<any | null>(null);
  const [assignContactId, setAssignContactId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const openDomain = (d: MyDomain) => {
    setManage({ domain: d, tab: 'details' });
    setNsEdit(false);
    setNsValue(d.nameservers.join('\n'));
    setAuthCode(null);
    setActionErr(null);
    setRenewMsg(null);
    setDomainContact(null);
    setAssignContactId('');
  };

  const updateManageDomain = (patch: Partial<MyDomain>) =>
    setManage(prev => prev ? { ...prev, domain: { ...prev.domain, ...patch } } : prev);

  const toggleLock = async () => {
    if (!manage) return;
    setActionErr(null);
    try {
      await lockMut.mutateAsync({ name: manage.domain.domainName, lock: !manage.domain.locked });
      updateManageDomain({ locked: !manage.domain.locked });
    } catch (e: any) { setActionErr(e.message); }
  };

  const togglePrivacy = async () => {
    if (!manage) return;
    setActionErr(null);
    try {
      await privacyMut.mutateAsync({ name: manage.domain.domainName, on: !manage.domain.privacyOn });
      updateManageDomain({ privacyOn: !manage.domain.privacyOn });
    } catch (e: any) { setActionErr(e.message); }
  };

  const fetchAuthCode = async () => {
    if (!manage) return;
    setAuthLoading(true);
    setActionErr(null);
    try {
      const r = await fetch(apiUrl(`/api/domains/${encodeURIComponent(manage.domain.domainName)}/auth-code`));
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || 'Failed');
      setAuthCode(j.authCode);
    } catch (e: any) { setActionErr(e.message); }
    finally { setAuthLoading(false); }
  };

  const saveNameservers = async () => {
    if (!manage) return;
    setActionErr(null);
    const ns = nsValue.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (ns.length < 2) { setActionErr('At least 2 nameservers required'); return; }
    try {
      await nsMut.mutateAsync({ name: manage.domain.domainName, nameservers: ns });
      updateManageDomain({ nameservers: ns });
      setNsEdit(false);
    } catch (e: any) { setActionErr(e.message); }
  };

  const fetchDomainContact = async () => {
    if (!manage) return;
    setContactLoading(true);
    try {
      const r = await fetch(apiUrl(`/api/domains/${encodeURIComponent(manage.domain.domainName)}/contacts?type=registrant`));
      const j = await r.json();
      setDomainContact(j.ok ? j.contact : null);
    } catch { setDomainContact(null); }
    finally { setContactLoading(false); }
  };

  const assignContact = async () => {
    if (!manage || !assignContactId) return;
    const c = contacts?.find(x => x.id === assignContactId);
    if (!c) return;
    setAssignLoading(true);
    setActionErr(null);
    try {
      const r = await fetch(apiUrl(`/api/domains/${encodeURIComponent(manage.domain.domainName)}/contacts`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'registrant', contact: { firstName: c.firstName, lastName: c.lastName, organization: c.organization ?? '', email: c.email, phone: c.phone, address1: c.address1, address2: c.address2 ?? '', city: c.city, state: c.state ?? '', postalCode: c.postalCode, country: c.country } }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to assign contact');
      setDomainContact({ ...c });
      setAssignContactId('');
    } catch (e: any) { setActionErr(e.message); }
    finally { setAssignLoading(false); }
  };

  const startRenew = async () => {
    if (!manage) return;
    setRenewLoading(true);
    setRenewMsg(null);
    setActionErr(null);
    try {
      const tld = manage.domain.tld;
      const tldRow = tlds?.find(t => t.tld === tld);
      const priceUsd = tldRow?.priceRenew ? Number(tldRow.priceRenew) : undefined;
      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ type: 'DOMAIN_RENEWAL', domain: manage.domain.domainName, years: renewYears }],
          paymentMethod: renewMethod,
          displayCurrency: 'USD',
          callbackUrl: `${window.location.origin}/dashboard?order=verify`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Renewal order failed');
      if (renewMethod === 'WALLET') {
        setRenewMsg({ ok: true, text: `Domain renewed for ${renewYears} year(s). New expiry: ${fmtDate(manage.domain.expiresAt)}.` });
        syncMut.mutate();
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch (e: any) { setActionErr(e.message); }
    finally { setRenewLoading(false); }
  };

  const openTab = (tab: ManageState['tab']) => {
    setManage(prev => prev ? { ...prev, tab } : prev);
    setActionErr(null);
    if (tab === 'contacts' && !domainContact) fetchDomainContact();
  };

  const d = manage?.domain;
  const tldRow = tlds?.find(t => t.tld === d?.tld);
  const renewPriceUsd = tldRow?.priceRenew ? Number(tldRow.priceRenew) * renewYears : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Domains</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            <RefreshCw className={cn('w-4 h-4 mr-1', syncMut.isPending && 'animate-spin')} />
            {syncMut.isPending ? 'Syncing…' : 'Sync'}
          </Button>
          <Link href="/domains">
            <Button className="bg-[#0A91F9] text-white hover:bg-[#0880de]" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Register
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-5 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
          <div className="col-span-2">Domain</div><div>Status</div><div>Expires</div><div>Actions</div>
        </div>
        {isLoading && <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {isError && <p className="p-6 text-sm text-red-600">Failed to load domains.</p>}
        {!isLoading && !isError && (domains?.length ?? 0) === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            <Globe className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-500">No domains yet</p>
            <p className="mt-1"><Link href="/domains" className="text-[#0A91F9] hover:underline">Search for a domain</Link> to get started.</p>
          </div>
        )}
        {domains?.map((dom, i) => (
          <div key={dom.id} className={cn('px-6 py-4 grid grid-cols-5 gap-4 items-center hover:bg-gray-50 transition-colors', i > 0 && 'border-t border-gray-100')}>
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-[#0A91F9]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{dom.domainName}</p>
                <p className="text-xs text-gray-400">{dom.autoRenew ? '↻ Auto-renew ON' : 'Auto-renew OFF'}</p>
              </div>
            </div>
            <div><StatusBadge status={dom.status} /></div>
            <div className="text-sm text-gray-600">{fmtDate(dom.expiresAt)}</div>
            <div>
              <button onClick={() => openDomain(dom)} className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-semibold transition-colors">
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      {manage && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setManage(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg text-gray-900">{d!.domainName}</h2>
                  <StatusBadge status={d!.status} />
                </div>
                <button onClick={() => setManage(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex gap-1">
                {(['details', 'contacts', 'renew'] as const).map(t => (
                  <button key={t} onClick={() => openTab(t)}
                    className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize',
                      manage.tab === t ? 'bg-blue-50 text-[#0A91F9]' : 'text-gray-500 hover:bg-gray-50')}>
                    {t === 'details' ? 'Details & Actions' : t === 'contacts' ? 'Registrant Contact' : 'Renew Domain'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {actionErr && <p className="text-sm text-red-600 mb-3 bg-red-50 p-2 rounded">{actionErr}</p>}

              {manage.tab === 'details' && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div><span className="text-gray-500 text-xs">Registered</span><p className="font-medium">{fmtDate(d!.registeredAt)}</p></div>
                    <div><span className="text-gray-500 text-xs">Expires</span><p className="font-medium">{fmtDate(d!.expiresAt)}</p></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <ActionRow icon={d!.locked ? Lock : Unlock} label={d!.locked ? 'Domain Locked' : 'Domain Unlocked'}
                      desc={d!.locked ? 'Prevents unauthorised transfers' : 'Domain can be transferred'}
                      actionLabel={d!.locked ? 'Unlock' : 'Lock'} loading={lockMut.isPending} onClick={toggleLock} />
                    <ActionRow icon={d!.privacyOn ? EyeOff : Eye} label={d!.privacyOn ? 'Privacy On' : 'Privacy Off'}
                      desc={d!.privacyOn ? 'WHOIS details are hidden' : 'WHOIS details are visible'}
                      actionLabel={d!.privacyOn ? 'Disable' : 'Enable'} loading={privacyMut.isPending} onClick={togglePrivacy} />
                  </div>
                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Server className="w-4 h-4 text-gray-400" />Nameservers</p>
                      <button onClick={() => setNsEdit(v => !v)} className="text-xs text-[#0A91F9] hover:underline">{nsEdit ? 'Cancel' : 'Edit'}</button>
                    </div>
                    {nsEdit ? (
                      <div>
                        <textarea value={nsValue} onChange={e => setNsValue(e.target.value)} rows={4}
                          placeholder="One nameserver per line&#10;ns1.example.com&#10;ns2.example.com"
                          className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0A91F9] font-mono" />
                        <Button onClick={saveNameservers} disabled={nsMut.isPending} size="sm" className="mt-2 bg-[#0A91F9] text-white hover:bg-[#0880de]">
                          {nsMut.isPending ? 'Saving…' : 'Save Nameservers'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {d!.nameservers.length ? d!.nameservers.map(ns => (
                          <p key={ns} className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">{ns}</p>
                        )) : <p className="text-xs text-gray-400">No nameservers on file — sync to refresh.</p>}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2"><Key className="w-4 h-4 text-gray-400" />Transfer Auth Code</p>
                    {authCode ? (
                      <p className="text-sm font-mono bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg break-all">{authCode}</p>
                    ) : (
                      <Button onClick={fetchAuthCode} disabled={authLoading} variant="outline" size="sm">
                        {authLoading ? 'Fetching…' : 'Get Auth Code'}
                      </Button>
                    )}
                  </div>
                </>
              )}

              {manage.tab === 'contacts' && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <Contact className="w-4 h-4 text-gray-400" />Registrant Contact (Dynadot)
                  </p>
                  {contactLoading ? (
                    <Skeleton className="h-20 w-full mb-4" />
                  ) : domainContact ? (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4 space-y-0.5">
                      <p className="font-semibold">{domainContact.firstName} {domainContact.lastName}</p>
                      {domainContact.organization && <p className="text-gray-500 text-xs">{domainContact.organization}</p>}
                      <p className="text-gray-600">{domainContact.email} · {domainContact.phone}</p>
                      <p className="text-gray-500 text-xs">{[domainContact.address1, domainContact.city, domainContact.country].filter(Boolean).join(', ')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mb-4">
                      No Dynadot contact on file. {' '}
                      <button onClick={fetchDomainContact} className="text-[#0A91F9] hover:underline">Fetch from Dynadot</button>
                    </p>
                  )}

                  {(contacts?.length ?? 0) > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Assign a saved contact as registrant</p>
                      <select value={assignContactId} onChange={e => setAssignContactId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A91F9] mb-2">
                        <option value="">— Select a contact profile —</option>
                        {contacts!.map(c => (
                          <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.type}) · {c.email}</option>
                        ))}
                      </select>
                      <Button onClick={assignContact} disabled={!assignContactId || assignLoading} size="sm" className="bg-[#0A91F9] text-white hover:bg-[#0880de]">
                        {assignLoading ? 'Assigning…' : 'Assign as Registrant'}
                      </Button>
                      <p className="text-xs text-gray-400 mt-2">This will update the registrant contact with Dynadot and link it to this domain.</p>
                    </div>
                  )}
                  {(contacts?.length ?? 0) === 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      No saved contacts. <Link href="/dashboard" className="text-[#0A91F9] hover:underline">Create one in the Contacts section</Link> first.
                    </p>
                  )}
                </div>
              )}

              {manage.tab === 'renew' && (
                <div>
                  {renewMsg ? (
                    <div className={cn('p-3 rounded-lg text-sm mb-4', renewMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                      {renewMsg.text}
                    </div>
                  ) : null}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Years</label>
                      <select value={renewYears} onChange={e => setRenewYears(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A91F9]">
                        {[1,2,3,5,10].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                      <div className="flex gap-2">
                        {(['WALLET', 'PAYSTACK'] as const).map(m => (
                          <button key={m} onClick={() => setRenewMethod(m)}
                            className={cn('flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors',
                              renewMethod === m ? 'bg-blue-50 border-[#0A91F9] text-[#0A91F9]' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                            {m === 'WALLET' ? '💳 Wallet' : '🏦 Paystack'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {renewPriceUsd !== null && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <span className="text-gray-500">Estimated cost: </span>
                        <span className="font-bold text-gray-900">${renewPriceUsd.toFixed(2)} USD</span>
                        {renewMethod === 'WALLET' && <span className="text-gray-500 text-xs ml-1">(debited from wallet)</span>}
                      </div>
                    )}
                    <Button onClick={startRenew} disabled={renewLoading || !!renewMsg?.ok} className="w-full bg-[#0A91F9] text-white hover:bg-[#0880de]">
                      {renewLoading ? 'Processing…' : renewMethod === 'WALLET' ? 'Renew from Wallet' : 'Proceed to Paystack Checkout'}
                    </Button>
                    <p className="text-xs text-gray-400">Renewal requires an active domain and available balance / Paystack payment.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionRow({ icon: Icon, label, desc, actionLabel, loading, onClick }: {
  icon: any; label: string; desc: string; actionLabel: string; loading: boolean; onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>
      <button onClick={onClick} disabled={loading}
        className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-white font-medium text-gray-700 disabled:opacity-50 flex-shrink-0 ml-2">
        {loading ? '…' : actionLabel}
      </button>
    </div>
  );
}

// ─── TRANSFERS ────────────────────────────────────────────────────────────────

function TransferList() {
  const { data: domains, isLoading } = useMyDomains();
  const transfers = domains?.filter(d => d.status === 'PENDING_TRANSFER') ?? [];
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const checkStatus = async (domainName: string) => {
    setLoading(p => ({ ...p, [domainName]: true }));
    try {
      const r = await fetch(apiUrl(`/api/domains/${encodeURIComponent(domainName)}/transfer-status`));
      const j = await r.json();
      setStatuses(p => ({ ...p, [domainName]: j.status || j.transferStatus || 'Unknown' }));
    } catch { setStatuses(p => ({ ...p, [domainName]: 'Error fetching status' })); }
    finally { setLoading(p => ({ ...p, [domainName]: false })); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transfers</h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading && <div className="p-6 space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {!isLoading && transfers.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-500">No in-progress transfers</p>
            <p className="mt-1"><Link href="/transfer" className="text-[#0A91F9] hover:underline">Start a domain transfer</Link></p>
          </div>
        )}
        {transfers.map((d, i) => (
          <div key={d.id} className={cn('px-6 py-4 flex items-center justify-between hover:bg-gray-50', i > 0 && 'border-t border-gray-100')}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{d.domainName}</p>
                <p className="text-xs text-gray-500">Started {fmtDate(d.registeredAt)}</p>
                {statuses[d.domainName] && <p className="text-xs text-gray-700 mt-0.5">Status: <span className="font-semibold">{statuses[d.domainName]}</span></p>}
              </div>
            </div>
            <button onClick={() => checkStatus(d.domainName)} disabled={loading[d.domainName]}
              className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium transition-colors">
              {loading[d.domainName] ? 'Checking…' : 'Check Status'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

const ORDER_TYPE_LABEL: Record<string, string> = {
  DOMAIN_REGISTRATION: 'Registration',
  DOMAIN_RENEWAL: 'Renewal',
  DOMAIN_TRANSFER: 'Transfer',
  DOMAIN_RESTORE: 'Restore',
  EMAIL_SUBSCRIPTION: 'Email Plan',
};

function OrderList() {
  const { formatPrice } = useCurrency();
  const { data, isLoading, isError } = useMyOrders();
  const orders = data?.items ?? [];
  const [receipt, setReceipt] = useState<MyOrder | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
          <div className="col-span-4">Description</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Receipt</div>
        </div>
        {isLoading && <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {isError && <p className="p-6 text-sm text-red-600">Failed to load orders.</p>}
        {!isLoading && !isError && orders.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            <ReceiptText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-500">No orders yet</p>
          </div>
        )}
        {orders.map((o, i) => (
          <div key={o.id} className={cn('px-6 py-3 grid grid-cols-12 gap-2 items-center hover:bg-gray-50 transition-colors', i > 0 && 'border-t border-gray-100')}>
            <div className="col-span-4">
              <p className="font-semibold text-gray-900 text-sm truncate">{o.description || o.type}</p>
              <p className="text-xs text-gray-400">{ORDER_TYPE_LABEL[o.type] ?? o.type} · {o.paymentMethod}</p>
              {o.fulfillmentNote && <p className="text-xs text-orange-600 truncate">{o.fulfillmentNote}</p>}
            </div>
            <div className="col-span-2"><StatusBadge status={o.status} /></div>
            <div className="col-span-2">
              <p className="text-sm font-semibold text-gray-900">{o.displayCurrency} {Number(o.displayAmount).toFixed(2)}</p>
              <p className="text-xs text-gray-400">{formatPrice(o.amountUsd)}</p>
            </div>
            <div className="col-span-2 text-xs text-gray-500">{fmtDate(o.createdAt)}</div>
            <div className="col-span-2">
              <button onClick={() => setReceipt(o)}
                className="text-xs flex items-center gap-1 text-[#0A91F9] hover:underline font-medium">
                <Info className="w-3 h-3" /> Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {receipt && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setReceipt(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Order Receipt</h3>
              <button onClick={() => setReceipt(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono font-semibold text-gray-800 text-xs">{receipt.paymentRef || receipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Description</span>
                <span className="font-medium text-right max-w-[60%] text-gray-800">{receipt.description || receipt.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium">{ORDER_TYPE_LABEL[receipt.type] ?? receipt.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={receipt.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium">{receipt.paymentMethod}</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between">
                <span className="text-gray-500">Amount (USD)</span>
                <span className="font-semibold">${Number(receipt.amountUsd).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Display Amount</span>
                <span className="font-semibold">{receipt.displayCurrency} {Number(receipt.displayAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold">{formatPrice(receipt.amountUsd)}</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{fmtDate(receipt.createdAt)}</span>
              </div>
              {receipt.metadata?.fulfillmentNote && (
                <div className="bg-orange-50 text-orange-700 text-xs p-2 rounded">Note: {receipt.metadata.fulfillmentNote}</div>
              )}
              {receipt.metadata?.fulfillmentError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded">
                  <span className="font-bold block mb-1">Registration Failed (Dynadot):</span>
                  {receipt.metadata.fulfillmentError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WALLET ───────────────────────────────────────────────────────────────────

function WalletSection() {
  const { formatPrice, currency } = useCurrency();
  const { user } = useAuth();
  useEffect(() => {
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);
  const { data: balData, refetch: refetchBal } = useWalletBalance();
  const { data: txnsData, refetch: refetchTxns } = useWalletTransactions();
  const bal = balData ? Number(balData.balanceUsd) : 0;
  const txns = txnsData?.items ?? [];
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('5000');
  const [topUpErr, setTopUpErr] = useState<string | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const refresh = useCallback(() => { refetchBal(); refetchTxns(); }, [refetchBal, refetchTxns]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('transaction_ref');
    if (!ref || !ref.startsWith('DRV-WAL-')) return;
    setVerifying(true);
    fetch(apiUrl(`/api/wallet/verify/${encodeURIComponent(ref)}`), { method: 'POST' })
      .then(r => r.json())
      .finally(() => { setVerifying(false); refresh(); window.history.replaceState({}, '', '/dashboard'); });
  }, [refresh]);

  const startTopUp = async () => {
    setTopUpErr(null);
    setTopUpLoading(true);
    try {
      const amt = Number(topUpAmount);
      if (!amt || amt <= 0) throw new Error('Invalid amount');
      
      const res = await fetch(apiUrl('/api/wallet/fund/init'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amt, callbackUrl: `${window.location.origin}/dashboard?wallet=funded` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Top-up failed');
      
      if (!(window as any).PaystackPop) {
        throw new Error('Paystack not loaded');
      }
      
      const handler = (window as any).PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user?.email || 'user@example.com',
        amount: Math.round(Number(data.displayAmount) * 100),
        currency: currency.code,
        ref: data.reference,
        callback: function() {
           setVerifying(true);
           setTopUpOpen(false);
           fetch(apiUrl(`/api/wallet/verify/${encodeURIComponent(data.reference)}`), { method: 'POST' })
             .then(r => r.json())
             .finally(() => { setVerifying(false); refresh(); });
        },
        onClose: function() {
           setTopUpLoading(false);
        }
      });
      handler.openIframe();
    } catch (e: any) { setTopUpErr(e?.message || 'Failed'); setTopUpLoading(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet & Billing</h1>
      {verifying && <div className="mb-4 text-sm bg-blue-50 text-blue-700 p-3 rounded-lg">Verifying your payment…</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#0A91F9]" />
            </div>
            <div><p className="font-bold text-gray-900">Wallet Balance</p><p className="text-xs text-gray-500">Available credits</p></div>
          </div>
          <p className="text-3xl font-bold text-[#0A91F9]">{formatPrice(bal)}</p>
          <Button onClick={() => setTopUpOpen(true)} className="mt-4 w-full bg-[#0A91F9] text-white hover:bg-[#0880de]">Top Up Wallet</Button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="font-bold text-gray-900 mb-2">How payments work</p>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>Wallet is funded in NGN via Paystack.</li>
            <li>Domain & email purchases settle in NGN at the current rate.</li>
            <li>Pay from wallet, or pay direct at checkout — your choice.</li>
          </ul>
        </div>
      </div>

      {topUpOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !topUpLoading && setTopUpOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-1">Top Up Wallet</h3>
            <p className="text-xs text-gray-500 mb-4">You'll be redirected to Paystack to complete payment.</p>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
            <input type="number" min={100} step={100} value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A91F9]" />
            <div className="flex gap-2 mt-2 flex-wrap">
              {[2000, 5000, 10000, 25000].map(p => (
                <button key={p} onClick={() => setTopUpAmount(String(p))} className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">{formatPrice(p)}</button>
              ))}
            </div>
            {topUpErr && <p className="text-sm text-red-600 mt-3">{topUpErr}</p>}
            <div className="flex gap-2 mt-6">
              <Button onClick={() => setTopUpOpen(false)} disabled={topUpLoading} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={startTopUp} disabled={topUpLoading} className="flex-1 bg-[#0A91F9] hover:bg-[#0880de] text-white">
                {topUpLoading ? 'Redirecting…' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-900 flex items-center justify-between">
          <span>Transaction History</span>
          <button onClick={refresh} className="text-xs text-[#0A91F9] hover:underline">Refresh</button>
        </div>
        {txns.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            No transactions yet.
          </div>
        ) : txns.map((tx, i) => (
          <div key={tx.id} className={cn('px-6 py-3 flex items-center justify-between hover:bg-gray-50', i > 0 && 'border-t border-gray-100')}>
            <div>
              <p className="text-sm font-semibold text-gray-800">{tx.description || tx.source}</p>
              <p className="text-xs text-gray-400">{fmtDate(tx.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className={cn('text-sm font-bold', tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-500')}>
                {tx.type === 'CREDIT' ? '+' : '−'}{formatPrice(tx.amountUsd)}
              </p>
              <StatusBadge status={tx.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CONTACTS ─────────────────────────────────────────────────────────────────

const DEFAULT_CONTACT_KEY = 'drave_default_contact_id';
const BLANK_CONTACT: ContactInput = {
  type: 'REGISTRANT', firstName: '', lastName: '', organization: '',
  email: '', phone: '', address1: '', address2: '', city: '', state: '', postalCode: '', country: '',
};

const TYPE_COLORS: Record<string, string> = {
  REGISTRANT: 'bg-blue-50 text-blue-600',
  ADMIN: 'bg-purple-50 text-purple-600',
  TECH: 'bg-green-50 text-green-600',
  BILLING: 'bg-yellow-50 text-yellow-700',
};

function ContactsSection() {
  const { data: contacts, isLoading } = useMyContacts();
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const deleteMut = useDeleteContact();
  const [editing, setEditing] = useState<MyContact | null | 'new'>(null);
  const [form, setForm] = useState<ContactInput>(BLANK_CONTACT);
  const [err, setErr] = useState<string | null>(null);
  const [defaultId, setDefaultId] = useState(() => localStorage.getItem(DEFAULT_CONTACT_KEY) ?? '');

  const setDefault = (id: string) => {
    setDefaultId(id);
    localStorage.setItem(DEFAULT_CONTACT_KEY, id);
  };

  const openNew = () => { setForm(BLANK_CONTACT); setEditing('new'); setErr(null); };
  const openEdit = (c: MyContact) => { setForm({ ...c }); setEditing(c); setErr(null); };
  const close = () => { setEditing(null); setErr(null); };

  const save = async () => {
    setErr(null);
    try {
      if (editing === 'new') {
        const created = await createMut.mutateAsync(form) as MyContact;
        if (!defaultId) setDefault(created.id);
      } else if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: form });
      }
      close();
    } catch (e: any) { setErr(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this contact profile?')) return;
    await deleteMut.mutateAsync(id);
    if (defaultId === id) { setDefaultId(''); localStorage.removeItem(DEFAULT_CONTACT_KEY); }
  };

  const f = (field: keyof ContactInput) => (
    <input value={String(form[field] ?? '')} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A91F9]" />
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WHOIS Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage registrant and contact profiles. The default is pre-filled at checkout.</p>
        </div>
        <Button onClick={openNew} className="bg-[#0A91F9] text-white hover:bg-[#0880de]" size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Contact
        </Button>
      </div>

      {defaultId && (
        <div className="mb-4 mt-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs text-blue-700 flex items-center gap-2">
          <Star className="w-3.5 h-3.5 fill-current" />
          Default registrant is set — it will be pre-filled when you register or transfer a domain.
        </div>
      )}

      {isLoading && <div className="space-y-3 mt-4">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>}
      {!isLoading && (!contacts || contacts.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm mt-4">
          <BookUser className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">No contact profiles yet</p>
          <p className="mt-1">Create a contact profile to use as your domain registrant.</p>
        </div>
      )}

      <div className="space-y-3 mt-4">
        {contacts?.map(c => (
          <div key={c.id} className={cn('bg-white rounded-xl border p-5 flex items-start justify-between transition-colors',
            defaultId === c.id ? 'border-[#0A91F9] bg-blue-50/30' : 'border-gray-200')}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', TYPE_COLORS[c.type] ?? 'bg-gray-100 text-gray-500')}>{c.type}</span>
                {defaultId === c.id && (
                  <span className="text-xs font-semibold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-current" /> Default
                  </span>
                )}
                <span className="font-bold text-gray-900">{c.firstName} {c.lastName}</span>
                {c.organization && <span className="text-xs text-gray-500">· {c.organization}</span>}
              </div>
              <p className="text-sm text-gray-600">{c.email} · {c.phone}</p>
              <p className="text-sm text-gray-500">{c.address1}{c.address2 ? `, ${c.address2}` : ''}, {c.city}{c.state ? `, ${c.state}` : ''} {c.postalCode}, {c.country}</p>
            </div>
            <div className="flex flex-col gap-1.5 ml-4 flex-shrink-0 items-end">
              {defaultId !== c.id && (
                <button onClick={() => setDefault(c.id)} title="Set as default registrant"
                  className="text-xs text-gray-400 hover:text-yellow-500 flex items-center gap-1 font-medium">
                  <Star className="w-3.5 h-3.5" /> Set default
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-[#0A91F9]"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => remove(c.id)} disabled={deleteMut.isPending} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4" onClick={close}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900">{editing === 'new' ? 'New Contact Profile' : 'Edit Contact'}</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {err && <p className="text-sm text-red-600 mb-3 bg-red-50 p-2 rounded">{err}</p>}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A91F9]">
                  {['REGISTRANT', 'ADMIN', 'TECH', 'BILLING'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Organization</label>{f('organization')}</div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name *</label>{f('firstName')}</div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name *</label>{f('lastName')}</div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email *</label>{f('email')}</div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone *</label>{f('phone')}</div>
              <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address Line 1 *</label>{f('address1')}</div>
              <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address Line 2</label>{f('address2')}</div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">City *</label>{f('city')}</div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">State / Province</label>{f('state')}</div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Postal Code *</label>{f('postalCode')}</div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country (ISO) *</label>{f('country')}</div>
            </div>
            <div className="flex gap-2">
              <Button onClick={close} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={save} disabled={createMut.isPending || updateMut.isPending} className="flex-1 bg-[#0A91F9] text-white hover:bg-[#0880de]">
                {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save Contact'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EMAIL LIST ───────────────────────────────────────────────────────────────

function EmailList() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/api/users/me/emails'))
      .then(r => r.ok ? r.json() : [])
      .then(d => setEmails(Array.isArray(d) ? d : []))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Plans</h1>
        <Link href="/email"><Button className="bg-[#0A91F9] text-white hover:bg-[#0880de]" size="sm"><Plus className="w-4 h-4 mr-1" />Add Plan</Button></Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && <div className="p-6 space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {!loading && emails.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            <Mail className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-500">No email plans yet</p>
            <p className="mt-1"><Link href="/email" className="text-[#0A91F9] hover:underline">Browse email plans</Link></p>
          </div>
        )}
        {emails.map((em, i) => (
          <div key={em.id} className={cn('px-6 py-4 grid grid-cols-4 gap-4 items-center hover:bg-gray-50', i > 0 && 'border-t border-gray-100')}>
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{em.planName}</p>
                <p className="text-xs text-gray-400">@{em.domain?.domainName ?? '—'} · {em.accounts} mailbox{em.accounts !== 1 ? 'es' : ''}</p>
              </div>
            </div>
            <div><StatusBadge status={em.status} /></div>
            <div className="text-sm text-gray-600">{fmtDate(em.expiresAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WHOIS ────────────────────────────────────────────────────────────────────

function WhoisSection() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setError(null); setResult(null);
    try {
      const r = await fetch(apiUrl(`/api/domains/whois?domain=${encodeURIComponent(query.trim())}`));
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'WHOIS lookup failed');
      setResult(j);
    } catch (e: any) { setError(e.message); }
    finally { setSearching(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">WHOIS Lookup</h1>
      <p className="text-gray-500 mb-6 text-sm">Look up the registration details for any domain name.</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter any domain (e.g. example.com)"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A91F9]" />
          </div>
          <Button type="submit" disabled={searching} className="bg-[#0A91F9] text-white hover:bg-[#0880de] px-6">
            {searching ? 'Looking up…' : 'Lookup'}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {result && (
          <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="font-bold text-gray-900 text-sm">{result.domain ?? query}</p>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
              {result.registrar && <div><span className="text-gray-500 text-xs">Registrar</span><p className="font-medium">{result.registrar}</p></div>}
              {result.registeredAt && <div><span className="text-gray-500 text-xs">Registered</span><p className="font-medium">{fmtDate(result.registeredAt)}</p></div>}
              {result.expiresAt && <div><span className="text-gray-500 text-xs">Expires</span><p className="font-medium">{fmtDate(result.expiresAt)}</p></div>}
              {result.updatedAt && <div><span className="text-gray-500 text-xs">Updated</span><p className="font-medium">{fmtDate(result.updatedAt)}</p></div>}
              {result.nameservers?.length > 0 && (
                <div className="col-span-2"><span className="text-gray-500 text-xs">Nameservers</span>
                  <p className="font-mono text-xs">{result.nameservers.join(', ')}</p></div>
              )}
            </div>
            <div className="px-4 pb-3">
              <button onClick={() => setShowRaw(v => !v)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Raw data
              </button>
              {showRaw && (
                <pre className="mt-2 text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-64 text-gray-600">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECURITY ─────────────────────────────────────────────────────────────────

function SecuritySection({ user }: { user: any }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h1>
      <div className="space-y-4">
        {[
          { title: 'Two-Factor Authentication', desc: '2FA adds an extra layer of security to your account.', enabled: user.twoFaEnabled, action: 'Enable 2FA' },
          { title: 'Password', desc: 'Use a strong, unique password for your account.', enabled: true, action: 'Change Password' },
          { title: 'Login Notifications', desc: 'Get notified by email when your account is accessed.', enabled: true, action: 'Configure' },
        ].map(({ title, desc, enabled, action }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', enabled ? 'bg-green-50' : 'bg-gray-100')}>
                <Shield className={cn('w-5 h-5', enabled ? 'text-green-500' : 'text-gray-400')} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
            <button className="text-sm border border-gray-300 px-4 py-1.5 rounded-lg hover:bg-gray-50 font-semibold transition-colors">{action}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

function ProfileSection({ user }: { user: any }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      setSaving(true);
      try {
        const res = await fetch(apiUrl('/api/users/me'), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageFile: base64String }) });
        if (res.ok) { setMessage('Profile image updated.'); setTimeout(() => window.location.reload(), 1000); }
        else setMessage('Failed to update image.');
      } catch { setMessage('Error updating image.'); }
      finally { setSaving(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true); setMessage('');
    try {
      const res = await fetch(apiUrl('/api/users/me'), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, lastName }) });
      setMessage(res.ok ? 'Profile updated successfully.' : 'Failed to update profile.');
    } catch { setMessage('Error updating profile.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="relative group cursor-pointer">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt={`${user.firstName} ${user.lastName}`} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 bg-[#0A91F9] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(user.firstName || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-semibold">Edit</span>
            </div>
            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={saving} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</p>
            <p className="text-gray-500 text-sm">@{user.username}</p>
            <p className="text-gray-400 text-xs">Member since {user.createdAt}</p>
          </div>
        </div>
        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${message.includes('successfully') || message.includes('updated') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">First Name</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A91F9]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Last Name</label>
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A91F9]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Username</label>
            <input type="text" value={user.username} disabled className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
            <input type="text" value={user.email} disabled className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="mt-6 bg-[#0A91F9] text-white hover:bg-[#0880de]">
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
