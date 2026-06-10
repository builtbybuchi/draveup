import { PageLayout } from "@/components/layout/PageLayout";
import { DomainSearch } from "@/components/ui/DomainSearch";
import { useCurrency } from "@/context/CurrencyContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Shield, Lock, Zap, ArrowRight, Activity, HeadphonesIcon, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { useTlds } from "@/hooks/useTlds";
import { searchDomains, type DomainSearchResult } from "@/hooks/useTlds";

export function Domains() {
  const { t } = useTranslation(['domains', 'common']);
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const { data: apiTlds = [], isLoading: tldsLoading } = useTlds();

  const [tldPage, setTldPage] = useState(0);
  const PAGE_SIZE = 20;
  const [searchBoxValue, setSearchBoxValue] = useState("");
  const [queryParam, setQueryParam] = useState<string | null>(null);

  const popularTlds = useMemo(
    () =>
      apiTlds
        .filter((t) => t.priceRegister != null)
        .map((t) => ({
          ext: t.ext,
          tld: t.tld,
          price: t.priceRegister!,
          ren: t.priceRenew ?? t.priceRegister!,
          transfer: t.priceTransfer ?? t.priceRegister!,
        })),
    [apiTlds],
  );

  // keep search box in sync with url ?search=
  useEffect(() => {
    if (queryParam == null) return;
    setSearchBoxValue(queryParam);
  }, [queryParam]);

  // Sync with actual browser URL on mount and when URL changes
  useEffect(() => {
    const syncUrlWithState = () => {
      const search = new URLSearchParams(window.location.search).get("search");
      setQueryParam(search);
    };
    
    syncUrlWithState();
    window.addEventListener('popstate', syncUrlWithState);
    return () => window.removeEventListener('popstate', syncUrlWithState);
  }, []);

  const [searchResults, setSearchResults] = useState<DomainSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!queryParam || popularTlds.length === 0) return;
    const controller = new AbortController();
    const searchDomain = queryParam.includes('.') ? queryParam.split('.')[0] : queryParam;
    const fixed = ["com", "org", "io", "co", "net"];
    const enabled = popularTlds.map((t) => t.tld);
    const pool = enabled.filter((tld) => !fixed.includes(tld));
    const random: string[] = [];
    const want = Math.min(4, pool.length);
    // deterministic-ish shuffle per query (simple hash) so it doesn't change every render
    let seed = 0;
    for (const ch of searchDomain) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const pickIdx = (n: number) => (n === 0 ? 0 : seed % n);
    let poolCopy = [...pool];
    for (let i = 0; i < want; i++) {
      const idx = pickIdx(poolCopy.length);
      random.push(poolCopy[idx]);
      poolCopy.splice(idx, 1);
      seed = (seed * 1664525 + 1013904223) >>> 0;
    }
    const tldSet = Array.from(new Set([...fixed, ...random]));
    setSearching(true);
    searchDomains(searchDomain, tldSet, { signal: controller.signal })
      .then(setSearchResults)
      .catch((err) => {
        // Aborts are expected (e.g. dev StrictMode / rapid searches)
        if ((err as any)?.name === "AbortError") return;
        console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [queryParam, popularTlds]);

  const handleRegister = (domain: string, price: number) => {
    addItem({
      type: 'domain',
      name: domain,
      description: 'Domain Registration',
      priceUsd: price,
      period: 1,
    });
  };

  const handlePickTldToSearch = (ext: string) => {
    const value = `example${ext.startsWith(".") ? ext : `.${ext}`}`;
    setSearchBoxValue(value);
    setQueryParam(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const searchedDomain = queryParam ? (queryParam.includes('.') ? queryParam : `${queryParam}.com`) : "";
  const searchedDomainInfo = searchResults.find((d) => d.domain === searchedDomain);
  const isAvailable = searchedDomainInfo?.available ?? false;
  const searchedPrice = searchedDomainInfo?.priceUsd ?? null;

  return (
    <PageLayout>
      <div className="bg-[#EFF7FF] pt-20 pb-16 border-b border-blue-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200 text-[#0A91F9] text-sm font-semibold mb-6 shadow-sm">
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">{t("hero.title")}</h1>
          <p className="text-xl text-gray-600 mb-10">{t("hero.subtitle")}</p>
          <DomainSearch size="lg" value={searchBoxValue} onChange={setSearchBoxValue} onSearch={setQueryParam} />
        </div>
      </div>

      {queryParam && (
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">{t("results.title")} "{queryParam}"</h2>
          <div className={`bg-white border rounded-xl p-6 flex flex-col md:flex-row items-center justify-between shadow-md mb-6 ${isAvailable ? "border-green-200" : "border-red-200"}`}>
            <div>
              <div className="flex items-center gap-3 mb-1">
                {isAvailable ? (
                  <CheckCircle2 className="text-green-500 w-6 h-6" />
                ) : (
                  <AlertCircle className="text-red-500 w-6 h-6" />
                )}
                <span className="text-2xl font-bold text-gray-900">{searchedDomain}</span>
              </div>
              {searching ? (
                <p className="text-gray-600 font-medium text-sm ml-9">{t("results.searching", { defaultValue: "Checking availability…" })}</p>
              ) : isAvailable ? (
                <p className="text-green-600 font-medium text-sm ml-9">{t("results.available")}</p>
              ) : (
                <p className="text-red-600 font-medium text-sm ml-9">{t("results.unavailable", { defaultValue: "Not available" })}</p>
              )}
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              {isAvailable && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{formatPrice(searchedPrice)}</div>
                  <div className="text-sm text-gray-500">{t("results.firstYear")}</div>
                </div>
              )}
              <Button
                onClick={() => (searchedPrice != null ? handleRegister(searchedDomain, searchedPrice) : undefined)}
                disabled={!isAvailable || searching || searchedPrice == null}
                className={isAvailable ? "bg-[#0A91F9] text-white hover:bg-[#0880de]" : "bg-gray-200 text-gray-500"}
                size="lg"
              >
                {t("cta.addToCart", { ns: "common" })}
              </Button>
            </div>
          </div>

          <h3 className="font-bold text-lg mb-4 mt-8 text-gray-900">{t("results.suggested")}</h3>
          <div className="grid gap-3">
            {searchResults
              .filter((r) => r.domain !== searchedDomain)
              .slice(0, 9)
              .map((r) => {
              const suggestedDomain = r.domain;
              const suggestedInfo = searchResults.find((d) => d.domain === suggestedDomain);
              const suggestedAvailable = suggestedInfo?.available ?? false;
              const suggestedPrice = suggestedInfo?.priceUsd ?? null;
              return (
                <div key={suggestedDomain} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                  <span className="font-bold text-lg text-gray-900">{suggestedDomain}</span>
                  <div className="flex items-center gap-4">
                    {suggestedAvailable ? (
                      <span className="font-bold text-gray-900">{formatPrice(suggestedPrice)}</span>
                    ) : (
                      <span className="text-sm font-semibold text-red-600">{t("results.unavailable", { defaultValue: "Not available" })}</span>
                    )}
                    <Button
                      onClick={() => (suggestedPrice != null ? handleRegister(suggestedDomain, suggestedPrice) : undefined)}
                      disabled={!suggestedAvailable || suggestedPrice == null || searching}
                      className="border-2 border-gray-200 text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50"
                      size="sm"
                    >
                      {t("cta.addToCart", { ns: "common" })}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">{t("pricing.title")}</h2>
          <p className="text-lg text-gray-600">{t("pricing.subtitle")}</p>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <th className="p-6 font-semibold">{t("pricing.extension")}</th>
                <th className="p-6 font-semibold">{t("pricing.firstYear")}</th>
                <th className="p-6 font-semibold">{t("pricing.renewal")}</th>
                <th className="p-6 font-semibold">{t("pricing.transfer")}</th>
                <th className="p-6 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {popularTlds
                .slice(tldPage * PAGE_SIZE, tldPage * PAGE_SIZE + PAGE_SIZE)
                .map((tld, idx) => (
                <tr key={tld.ext} className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="p-6 font-bold text-lg text-[#0A91F9]">{tld.ext}</td>
                  <td className="p-6 font-bold text-gray-900">{formatPrice(tld.price)}</td>
                  <td className="p-6 text-gray-600">{formatPrice(tld.ren)}</td>
                  <td className="p-6 text-gray-600">{formatPrice(tld.transfer)}</td>
                  <td className="p-6 text-right">
                    <Button onClick={() => handlePickTldToSearch(tld.ext)} className="border-2 border-gray-200 bg-white text-gray-900 hover:bg-gray-50" size="sm">
                      {t("pricing.register")}
                    </Button>
                  </td>
                </tr>
              ))}
              {popularTlds.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500 text-sm">
                  {tldsLoading ? "Loading TLD pricing…" : "TLD pricing not configured yet."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {popularTlds.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button
              onClick={() => setTldPage((p) => Math.max(0, p - 1))}
              disabled={tldPage === 0}
              className="border-2 border-gray-200 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              size="sm"
            >
              Previous
            </Button>
            <div className="text-sm font-semibold text-gray-600">
              Page {tldPage + 1} of {Math.max(1, Math.ceil(popularTlds.length / PAGE_SIZE))}
            </div>
            <Button
              onClick={() => setTldPage((p) => Math.min(Math.ceil(popularTlds.length / PAGE_SIZE) - 1, p + 1))}
              disabled={tldPage >= Math.ceil(popularTlds.length / PAGE_SIZE) - 1}
              className="border-2 border-gray-200 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              size="sm"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <div className="bg-[#F5F7FA] py-24 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
           <div className="text-center mb-16">
             <h2 className="text-3xl font-bold text-gray-900">{t("features.title")}</h2>
           </div>
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Shield, k: "privacy" },
              { icon: Lock, k: "lock" },
              { icon: Zap, k: "dns" },
              { icon: ArrowRight, k: "forwarding" },
              { icon: Activity, k: "dnssec" },
              { icon: HeadphonesIcon, k: "support" }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 text-[#0A91F9]">
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{t(`features.${f.k}.title`)}</h3>
                <p className="text-gray-600 leading-relaxed">{t(`features.${f.k}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
