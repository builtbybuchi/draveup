import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { BrandPattern } from "@/components/ui/BrandPattern";
import { CheckCircle2, Mail, ShieldCheck, Smartphone, RefreshCw, Users, Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/context/CurrencyContext";
import { useCart } from "@/context/CartContext";

export function Email() {
  const { t } = useTranslation(['email', 'common']);
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();

  const handleAddPlan = (planKey: string, planName: string, price: number) => {
    addItem({
      type: 'email',
      name: planName,
      description: 'Professional Email Plan',
      priceUsd: price * 12, // monthly price -> annual; server re-prices using planKey
      period: 1,
      planKey,
    });
  };

  const plans = [
    { k: "starter", price: 1.99 },
    { k: "business", price: 3.99, pop: true },
    { k: "enterprise", price: 6.99 }
  ];

  return (
    <PageLayout>
      <section className="relative pt-24 pb-20 text-center px-4 bg-[#F5F7FA] overflow-hidden">
        <BrandPattern variant="blue-on-light" opacity={0.07} rows={7} cols={18} />
        <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-semibold mb-6 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-[#0A91F9]" />
          {t("hero.badge")}
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900">{t("hero.title")}</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          {t("hero.subtitle")}
        </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t("plans.title")}</h2>
            <p className="text-gray-600 text-lg">{t("plans.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <div key={i} className={`bg-white border ${plan.pop ? 'border-[#0A91F9] shadow-xl scale-105 z-10' : 'border-gray-200 shadow-sm'} rounded-3xl p-8 flex flex-col relative`}>
                {plan.pop && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0A91F9] text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">{t("cta.choosePlan", {ns: "common"})}</div>}
                <h3 className="text-2xl font-bold mb-1 text-gray-900">{t(`plans.${plan.k}.name`)}</h3>
                <p className="text-gray-500 text-sm font-medium mb-6 h-10">{t(`plans.${plan.k}.desc`)}</p>
                <div className="mb-6 border-b border-gray-100 pb-6">
                  <span className="text-4xl font-extrabold text-gray-900">{formatPrice(plan.price)}</span>
                  <span className="text-gray-500 font-medium">/mo per user</span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center text-gray-700 font-medium"><Users className="w-5 h-5 text-[#0A91F9] mr-3" /> {t(`plans.${plan.k}.users`)}</li>
                  <li className="flex items-center text-gray-700 font-medium"><Database className="w-5 h-5 text-[#0A91F9] mr-3" /> {t(`plans.${plan.k}.storage`)}</li>
                  {[t("featureList.webmail"), t("featureList.spam"), t("featureList.mobile")].map((f, j) => (
                    <li key={j} className="flex items-center text-gray-700 font-medium"><CheckCircle2 className="w-5 h-5 text-[#0A91F9] mr-3" /> {f}</li>
                  ))}
                </ul>
                <Button 
                  onClick={() => handleAddPlan(plan.k, t(`plans.${plan.k}.name`), plan.price)}
                  className={`w-full text-base py-6 ${plan.pop ? 'bg-[#0A91F9] text-white hover:bg-[#0880de]' : 'border-2 border-gray-200 bg-transparent text-gray-900 hover:bg-gray-50'}`}
                >
                  {t("cta.selectPlan", {ns: "common"})}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#F5F7FA] border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-900">{t("features.title")}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Mail, k: "f1" },
              { icon: ShieldCheck, k: "f2" },
              { icon: CheckCircle2, k: "f3" },
              { icon: Database, k: "f4" },
              { icon: Smartphone, k: "f5" },
              { icon: Users, k: "f6" },
              { icon: RefreshCw, k: "f7" },
              { icon: ShieldCheck, k: "f8" }
            ].map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
                <div className="w-12 h-12 bg-blue-50 text-[#0A91F9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold mb-2 text-gray-900">{t(`features.${f.k}.title`)}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{t(`features.${f.k}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#0A91F9] text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-10">{t("cta.subtitle")}</p>
          <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-white text-[#0A91F9] hover:bg-gray-50 px-10 text-lg h-14 rounded-full font-bold">
            {t("cta.button")}
          </Button>
        </div>
      </section>
    </PageLayout>
  );
}
