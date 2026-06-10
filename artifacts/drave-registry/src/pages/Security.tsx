import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Shield, ShieldAlert, Lock, CheckCircle2, Server } from "lucide-react";

export function Security() {
  const { t } = useTranslation(['security', 'common']);

  return (
    <PageLayout>
      <section className="pt-24 pb-20 text-center px-4 bg-white border-b border-gray-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EFF7FF] border border-blue-200 text-primary text-sm font-semibold mb-6 shadow-sm">
            <Shield className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900">{t("hero.title")}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      <section className="py-24 bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t("ssl.title")}</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">{t("ssl.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { k: "dv", price: "Free" },
              { k: "ov", price: "$59.99/yr" },
              { k: "ev", price: "$149.99/yr" },
              { k: "wildcard", price: "$99.99/yr" }
            ].map((ssl, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t(`ssl.${ssl.k}.name`)}</h3>
                <p className="text-gray-500 text-sm mb-6 h-12">{t(`ssl.${ssl.k}.desc`)}</p>
                <div className="text-2xl font-bold text-gray-900 mb-6">{ssl.price}</div>
                <Button variant="outline" className="w-full border-gray-300">Select</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-gray-900">{t("features.title")}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              { icon: Lock, k: "f1" },
              { icon: Server, k: "f2" },
              { icon: ShieldAlert, k: "f3" },
              { icon: Shield, k: "f4" },
              { icon: CheckCircle2, k: "f5" },
              { icon: Lock, k: "f6" }
            ].map((f, i) => (
              <div key={i} className="flex gap-4">
                <f.icon className="w-8 h-8 text-primary shrink-0 p-1.5 bg-blue-50 rounded-lg" />
                <div>
                  <h4 className="text-xl font-bold mb-2 text-gray-900">{t(`features.${f.k}.title`)}</h4>
                  <p className="text-gray-600 leading-relaxed text-sm">{t(`features.${f.k}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-primary text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">{t("cta.subtitle")}</p>
          <Button variant="outline" size="lg" className="bg-white text-primary border-none hover:bg-gray-50 px-10 text-lg h-14 rounded-full">
            {t("cta.button")}
          </Button>
        </div>
      </section>
    </PageLayout>
  );
}
