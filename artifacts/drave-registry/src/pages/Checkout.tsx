import { useAuth as useClerkAuth } from '@clerk/react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, ShoppingCart, CheckCircle2, Trash2, Wallet, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '@/lib/api';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const cartTypeToOrderType: Record<string, string> = {
  domain: 'DOMAIN_REGISTRATION',
  email: 'EMAIL_SUBSCRIPTION',
  transfer: 'DOMAIN_TRANSFER',
};

export function Checkout() {
  const { t } = useTranslation(['checkout']);
  const { isAuthenticated, user, openLoginModal } = useAuth();
  const { getToken } = useClerkAuth();
  const { items, removeItem, subtotalUsd, clearCart } = useCart();
  const { formatPrice, currency } = useCurrency();
  const [, setLocation] = useLocation();

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletUsd, setWalletUsd] = useState<number>(0);
  const [method, setMethod] = useState<'WALLET' | 'PAYSTACK' | 'LEMON_SQUEEZY' | 'PAYHIP'>('PAYSTACK');

  useEffect(() => {
    if (!isAuthenticated) return;
    getToken().then(token => {
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(apiUrl('/api/wallet/balance'), { headers });
    })
      .then((r) => r.ok ? r.json() : { balanceUsd: 0 })
      .then((d) => setWalletUsd(Number(d.balanceUsd || 0)))
      .catch(() => setWalletUsd(0));
  }, [isAuthenticated, getToken]);

  useEffect(() => {
    // Dynamically load Paystack script
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <PageLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-[#0A91F9]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('loginRequired.title')}</h1>
            <p className="text-gray-500 mb-6">{t('loginRequired.desc')}</p>
            <Button onClick={() => openLoginModal('/checkout')} className="bg-[#0A91F9] text-white hover:bg-[#0880de] px-8">
              {t('loginRequired.button')}
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (orderPlaced) {
    return (
      <PageLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('orderConfirmed.title')}</h1>
            <p className="text-gray-500 mb-6">{t('orderConfirmed.desc')}</p>
            <Link href="/dashboard">
              <Button className="bg-[#0A91F9] text-white hover:bg-[#0880de] px-8">{t('orderConfirmed.button')}</Button>
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (items.length === 0) {
    return (
      <PageLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('emptyCart.title')}</h1>
            <p className="text-gray-500 mb-6">{t('emptyCart.desc')}</p>
            <Link href="/domains"><Button className="bg-[#0A91F9] text-white hover:bg-[#0880de] px-8">{t('emptyCart.button')}</Button></Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const totalUsd = subtotalUsd;
  const walletEnough = walletUsd >= totalUsd && totalUsd > 0;

  const handlePaystackInline = async (orderData: any) => {
    if (!window.PaystackPop) {
      setError("Paystack is not loaded. Please refresh.");
      setPlacing(false);
      return;
    }

    const token = await getToken();
    const amountInSmallestUnit = Math.round(Number(orderData.displayAmount) * 100);

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: orderData.email,
      amount: amountInSmallestUnit,
      currency: currency.code,
      ref: orderData.reference,
      callback: function(response: any) {
        const headers = new Headers();
        if (token) headers.set('Authorization', `Bearer ${token}`);
        
        fetch(apiUrl(`/api/orders/${orderData.orderId}/verify`), { method: 'POST', headers })
          .then(r => r.json())
          .then(res => {
            if (res.status === 'PAID') {
              clearCart();
              setOrderPlaced(true);
            } else {
              setError("Payment verification is pending or failed. Please check your dashboard.");
            }
          })
          .catch(() => setError("Error verifying payment."))
          .finally(() => setPlacing(false));
      },
      onClose: function() {
        setPlacing(false);
      }
    });
    handler.openIframe();
  };

  const placeOrder = async () => {
    if (method === 'LEMON_SQUEEZY' || method === 'PAYHIP') {
       setError(`Payment via ${method.replace('_', ' ')} is coming soon. Please use Wallet or Paystack.`);
       return;
    }

    setPlacing(true);
    setError(null);
    try {
      const apiItems = items.map((it) => {
        const type = cartTypeToOrderType[it.type] || 'DOMAIN_REGISTRATION';
        if (type === 'EMAIL_SUBSCRIPTION') {
          return { type, planKey: it.planKey || it.name.toLowerCase(), years: it.period, quantity: it.qty };
        }
        return {
          type, domain: it.name, years: it.period, quantity: it.qty,
          ...(type === 'DOMAIN_TRANSFER' && it.authCode ? { authCode: it.authCode } : {}),
        };
      });

      const token = await getToken();
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: apiItems,
          paymentMethod: method,
          displayCurrency: currency.code,
          callbackUrl: `${window.location.origin}/dashboard?order=verify`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Order failed');

      if (method === 'WALLET') {
        clearCart();
        setOrderPlaced(true);
        setPlacing(false);
      } else if (method === 'PAYSTACK') {
        handlePaystackInline(data);
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      setPlacing(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('pageTitle')}</h1>
          <Link href="/exchange-rates">
            <button className="text-sm font-medium text-[#0A91F9] hover:underline flex items-center gap-1">
              <Info className="w-4 h-4" /> Exchange Rate Info
            </button>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">{t('account.label')}</h2>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-10 h-10 bg-[#0A91F9] rounded-full flex items-center justify-center text-white font-bold">
                  {user?.firstName[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <span className="ml-auto text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full font-semibold">{t('account.loggedIn')}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#0A91F9]" /> {t('payment.label')}
              </h2>
              <div className="space-y-3">
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${method === 'PAYSTACK' ? 'border-[#0A91F9] bg-blue-50/40' : 'border-gray-200'}`}>
                  <input type="radio" name="pm" checked={method === 'PAYSTACK'} onChange={() => setMethod('PAYSTACK')} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#0A91F9]" />
                      <span className="font-semibold text-sm">Paystack</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Secure payment directly on our website.</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${method === 'WALLET' ? 'border-[#0A91F9] bg-blue-50/40' : 'border-gray-200'}`}>
                  <input type="radio" name="pm" checked={method === 'WALLET'} onChange={() => setMethod('WALLET')} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#0A91F9]" />
                      <span className="font-semibold text-sm">{t('payment.wallet')}</span>
                      {!walletEnough && <span className="text-xs text-orange-500 font-medium">Insufficient — top up first</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Wallet balance: {formatPrice(walletUsd)}
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${method === 'LEMON_SQUEEZY' ? 'border-[#0A91F9] bg-blue-50/40' : 'border-gray-200 opacity-60'}`}>
                  <input type="radio" name="pm" checked={method === 'LEMON_SQUEEZY'} onChange={() => setMethod('LEMON_SQUEEZY')} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Lemon Squeezy</span>
                      <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded uppercase font-bold">Coming Soon</span>
                    </div>
                  </div>
                </label>
                
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${method === 'PAYHIP' ? 'border-[#0A91F9] bg-blue-50/40' : 'border-gray-200 opacity-60'}`}>
                  <input type="radio" name="pm" checked={method === 'PAYHIP'} onChange={() => setMethod('PAYHIP')} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Payhip</span>
                      <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded uppercase font-bold">Coming Soon</span>
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <Lock className="w-3 h-3" />
                <span>{t('payment.secure')}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-4">{t('summary.title')}</h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.description} · {item.period} yr</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-900">{formatPrice(item.priceUsd * item.period * item.qty)}</span>
                      <button onClick={() => removeItem(item.id)} className="p-0.5 hover:text-red-500 text-gray-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t('summary.subtotal')}</span><span>{formatPrice(subtotalUsd)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-100">
                  <span>{t('summary.total')}</span><span>{formatPrice(totalUsd)}</span>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
              <Button
                onClick={placeOrder}
                disabled={placing || (method === 'WALLET' && !walletEnough)}
                className="w-full bg-[#0A91F9] hover:bg-[#0880de] text-white font-bold py-3 rounded-xl mt-6 text-base"
              >
                {placing ? t('summary.placing') : method === 'WALLET' ? t('summary.placeOrder') : t('summary.placeOrder')}
              </Button>
              {method === 'WALLET' && !walletEnough && (
                <button
                  onClick={() => setLocation('/dashboard')}
                  className="w-full text-xs text-[#0A91F9] hover:underline mt-2 font-medium"
                >
                  Top up wallet →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
