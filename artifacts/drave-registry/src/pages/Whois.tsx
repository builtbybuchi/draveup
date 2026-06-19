import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Search, Globe, Shield, Calendar, Server } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { apiUrl } from "@/lib/api";

export function Whois() {
  const { t } = useTranslation(['whois']);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setSearching(true);
    
    try {
      const response = await fetch(apiUrl(`/api/domains/whois?domain=${encodeURIComponent(query)}`));
      const data = await response.json();
      const fmt = (d?: string | null) => (d ? new Date(d).toISOString().split('T')[0] : "—");

      if (data.found) {
        setResult({
          domain: data.domain || query,
          status: Array.isArray(data.status) && data.status.length ? data.status.join(", ") : t('result.registered'),
          registrar: data.registrar || "Unknown",
          created: fmt(data.createdAt),
          expires: fmt(data.expiresAt),
          updated: fmt(data.updatedAt),
          nameservers: data.nameservers || [],
          raw: JSON.stringify(data.raw ?? data, null, 2),
        });
      } else {
        setResult({
          domain: data.domain || (query.includes('.') ? query : `${query}.com`),
          status: data.error ? t('result.statusUnavailable') : t('result.status'),
          registrar: "—",
          created: "—",
          expires: "—",
          updated: "—",
          nameservers: [],
          raw: data.error
            ? `Error: ${data.error}\n\nPlease try again in a few moments.`
            : `Domain Name: ${(data.domain || query).toUpperCase()}\nStatus: Not Registered\n\nThis domain appears to be available for registration.`,
        });
      }
    } catch (err) {
      console.error(err);
      setResult({
        domain: query.includes('.') ? query : `${query}.com`,
        status: "Error fetching WHOIS",
        registrar: "-",
        created: "-",
        expires: "-",
        updated: "-",
        nameservers: [],
        raw: "Error communicating with the backend API."
      });
    } finally {
      setSearching(false);
    }
  };

  const infoItems = (t('info.useItems', { returnObjects: true }) as string[]) || [];

  return (
    <PageLayout>
      <section className="pt-24 pb-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">{t('title')}</h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('form.placeholder')}
              className="w-full pl-14 pr-32 py-4 border-2 border-gray-200 rounded-2xl text-lg focus:outline-none focus:border-[#0A91F9] shadow-sm"
              required
            />
            <Button 
              type="submit" 
              disabled={searching}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 bg-[#0A91F9] hover:bg-[#0880de] text-white rounded-xl font-bold"
            >
              {searching ? t('form.searching') : t('form.searchButton')}
            </Button>
          </form>
        </div>
      </section>

      {result && (
        <section className="py-12 bg-gray-50 border-t border-gray-200">
          <div className="max-w-5xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{result.domain}</h2>
                  <span className="inline-block bg-blue-50 text-[#0A91F9] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {result.status}
                  </span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                      <Shield className="w-4 h-4" /> {t('result.registrarInfo')}
                    </h3>
                    <p className="font-semibold text-gray-900">{result.registrar}</p>
                  </div>
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                      <Calendar className="w-4 h-4" /> {t('result.importantDates')}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">{t('result.registered')}:</span> <span className="font-medium text-gray-900">{result.created}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{t('result.expires')}:</span> <span className="font-medium text-gray-900">{result.expires}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{t('result.updated')}:</span> <span className="font-medium text-gray-900">{result.updated}</span></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                      <Server className="w-4 h-4" /> {t('result.nameServers')}
                    </h3>
                    <ul className="text-sm font-medium text-gray-900 space-y-1">
                      {result.nameservers.map((ns: string, i: number) => <li key={i}>{ns}</li>)}
                    </ul>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">{t('result.rawWhois')}</h3>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-auto max-h-[300px]">
                    {result.raw}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('info.title')}</h2>
              <p className="text-gray-600 leading-relaxed">
                {t('info.text')}
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('info.useTitle')}</h2>
              <ul className="space-y-3 text-gray-600">
                {infoItems.map((item: string, idx: number) => (
                  <li key={idx} className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#0A91F9] mt-2 flex-shrink-0" /> {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

    </PageLayout>
  );
}
