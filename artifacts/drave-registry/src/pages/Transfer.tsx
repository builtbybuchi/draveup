import { useMemo, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { BrandPattern } from "@/components/ui/BrandPattern";
import { RefreshCw, CheckCircle2, Search, ArrowRight, Info } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useTlds } from "@/hooks/useTlds";
import { useTranslation } from "react-i18next";

export function Transfer() {
  const { t } = useTranslation(['transfer']);
  const [domain, setDomain] = useState("");
  const [authCode, setAuthCode] = useState("");
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const { data: apiTlds = [], isLoading: tldsLoading } = useTlds();

  const transferRows = useMemo(
    () =>
      apiTlds
        .filter((tld) => tld.priceTransfer != null || tld.priceRegister != null)
        .map((tld) => ({
          ext: tld.ext,
          trans: tld.priceTransfer ?? tld.priceRegister!,
          ren: tld.priceRenew ?? tld.priceRegister!,
        })),
    [apiTlds],
  );

  const tldFor = (d: string) => {
    const dot = d.lastIndexOf(".");
    if (dot < 0) return null;
    const tld = d.slice(dot + 1).toLowerCase();
    return apiTlds.find((t) => t.tld === tld) || null;
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;
    const matched = tldFor(domain);
    const price = matched?.priceTransfer ?? matched?.priceRegister ?? 0;
    addItem({
      type: 'transfer',
      name: domain,
      description: t('form.submitButton'),
      priceUsd: price,
      period: 1,
      authCode: authCode.trim() || undefined,
    });
    setDomain("");
    setAuthCode("");
  };

  const benefits = t('benefits.items', { returnObjects: true });

  return (
    <PageLayout>
      <section className="relative pt-24 pb-20 bg-[#EFF7FF] border-b border-blue-100 overflow-hidden">
        <BrandPattern variant="blue-on-light" opacity={0.07} rows={7} cols={18} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200 text-[#0A91F9] text-sm font-semibold mb-6 shadow-sm">
            <RefreshCw className="w-4 h-4" /> {t('badge')}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">{t('title')}</h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          
          <form onSubmit={handleTransfer} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 max-w-2xl mx-auto flex flex-col md:flex-row gap-4">
            <div className="flex-1 text-left">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('form.domainLabel')}</label>
              <input 
                type="text" 
                value={domain} 
                onChange={(e) => setDomain(e.target.value)}
                placeholder={t('form.domainPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A91F9]"
                required
              />
            </div>
            <div className="flex-1 text-left">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('form.authCodeLabel')}</label>
              <input 
                type="password" 
                value={authCode} 
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder={t('form.authCodePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A91F9]"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="lg" className="w-full md:w-auto h-12 bg-[#0A91F9] text-white hover:bg-[#0880de] rounded-xl px-8 font-bold">
                {t('form.submitButton')}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('benefits.title')}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {(benefits as any[]).map((b: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <CheckCircle2 className="w-8 h-8 text-[#0A91F9] mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-gray-600 text-sm">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#F5F7FA] border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('pricing.title')}</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-600">{t('pricing.extension')}</th>
                  <th className="p-4 font-semibold text-gray-600">{t('pricing.transferPrice')}</th>
                  <th className="p-4 font-semibold text-gray-600">{t('pricing.renewalPrice')}</th>
                </tr>
              </thead>
              <tbody>
                {transferRows.map((row, i) => (
                  <tr key={row.ext} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="p-4 font-bold text-lg text-[#0A91F9]">{row.ext}</td>
                    <td className="p-4 font-bold text-gray-900">{formatPrice(row.trans)} <span className="text-xs font-normal text-gray-500">{t('pricing.includes1yr')}</span></td>
                    <td className="p-4 text-gray-600">{formatPrice(row.ren)}{t('pricing.perYear')}</td>
                  </tr>
                ))}
                {transferRows.length === 0 && (
                  <tr><td colSpan={3} className="p-12 text-center text-gray-500 text-sm">
                    {tldsLoading ? t('pricing.loading') : t('pricing.notConfigured')}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('faq.title')}</h2>
          <div className="space-y-4">
            {(t('faq.items', { returnObjects: true }) as any[]).map((faq: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#0A91F9]" /> {faq.q}
                </h3>
                <p className="text-gray-600 pl-7">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </PageLayout>
  );
}
