import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string | null;
  rate: number; // against 1 USD
}

const FALLBACK_USD: Currency = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  flag: '🇺🇸',
  rate: 1,
};

interface CurrencyContextType {
  currency: Currency;
  currencies: Currency[];
  setCurrencyCode: (code: string) => void;
  formatPrice: (usdPrice: number | null | undefined) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([FALLBACK_USD]);
  const [currencyCode, setCurrencyCodeState] = useState<string>('USD');
  const [loading, setLoading] = useState(true);

  // Load all enabled currencies from the API on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/currency');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list: Currency[] = await res.json();
        if (cancelled || !Array.isArray(list) || list.length === 0) return;
        setCurrencies(list);

        // 1. User saved preference in localStorage
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('drave-currency') : null;
        if (saved && list.find((c) => c.code === saved)) {
          setCurrencyCodeState(saved);
          return;
        }

        // 2. IP-based detection disabled per request; always default to USD unless saved in localStorage
      } catch (err) {
        console.warn('Currency load failed; using USD only:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setCurrencyCode = (code: string) => {
    setCurrencyCodeState(code);
    try { localStorage.setItem('drave-currency', code); } catch { /* ignore */ }
  };

  const currency = useMemo(
    () => currencies.find((c) => c.code === currencyCode) || currencies[0] || FALLBACK_USD,
    [currencies, currencyCode],
  );

  const formatPrice = (usdPrice: number | null | undefined) => {
    if (usdPrice === null || usdPrice === undefined || Number.isNaN(usdPrice)) {
      return `${currency.symbol}—`;
    }
    const converted = usdPrice * currency.rate;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
        .format(converted)
        .replace(currency.code, currency.symbol);
    } catch {
      return `${currency.symbol}${converted.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, currencies, setCurrencyCode, formatPrice, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Backwards-compat: keep `currencies` export usable from old imports
export const currencies: Record<string, Currency> = {
  USD: FALLBACK_USD,
};
export type CurrencyCode = string;
