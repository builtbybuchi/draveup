import { PageLayout } from '@/components/layout/PageLayout';
import { useTranslation } from 'react-i18next';
import { Info, RefreshCw } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

export function ExchangeRateInfo() {
  const { t } = useTranslation(['common']);
  const { currencies, loading } = useCurrency();

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Info className="w-6 h-6 text-[#0A91F9]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Currency & Exchange Rates</h1>
              <p className="text-sm text-gray-500">How we process payments</p>
            </div>
          </div>
          
          <div className="space-y-6 text-gray-600">
            <p>
              Our primary operating currency is the <strong>US Dollar (USD)</strong>. To provide a seamless experience globally, our system defaults to displaying prices in USD.
            </p>
            <p>
              Users from Nigeria and other regions can manually switch their display currency using the currency selector. When you choose to view or pay in <strong>Nigerian Naira (NGN)</strong>, we apply our internal exchange rate.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#0A91F9]" />
                Automated Exchange Rate Sync
              </h2>
              <p className="text-sm leading-relaxed mb-4">
                Our exchange rates are not arbitrary. We have built an internal system that checks for the latest global exchange rates every day at midnight (12:00 AM) using reliable internet sources. This ensures the rates you see reflect current market conditions as accurately as possible.
              </p>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Current Rates (vs 1 USD)</h3>
                {loading ? (
                  <p className="text-sm text-gray-400">Loading rates...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {currencies.filter(c => c.code !== 'USD').map(c => (
                      <div key={c.code} className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{c.code}</span>
                        <span className="font-semibold text-gray-900">{c.symbol}{Number(c.rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500 italic">
              * Note: While we update our rates daily, foreign exchange markets fluctuate constantly. The rate applied at checkout may differ slightly from your bank's rate.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
