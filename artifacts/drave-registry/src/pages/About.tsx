import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import CountUp from "react-countup";
import { Target, ShieldCheck, Heart, Zap } from "lucide-react";
import { motion } from "framer-motion";

export function About() {
  const { t } = useTranslation(['about', 'common']);

  return (
    <PageLayout>
      <section className="pt-24 pb-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-primary text-sm font-semibold mb-6 shadow-sm">
            {t("hero.badge")}
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-8 text-gray-900">{t("hero.title")}</h1>
          <p className="text-2xl text-gray-600 leading-relaxed font-light">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-[#F5F7FA] py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { k: "domains" },
            { k: "customers" },
            { k: "countries" },
            { k: "uptime" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <h3 className="text-4xl font-extrabold text-primary mb-2">
                {t(`stats.${stat.k}.value`)}
              </h3>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t(`stats.${stat.k}.label`)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("mission.title")}</h2>
            <p className="text-xl text-gray-600 leading-relaxed border-l-4 border-primary pl-6 py-2 italic">
              "{t("mission.desc")}"
            </p>
          </div>

          <div className="prose prose-lg max-w-none text-gray-600">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 not-prose">{t("story.title")}</h2>
            <p className="mb-6">{t("story.p1")}</p>
            <p className="mb-6">{t("story.p2")}</p>
            <p>{t("story.p3")}</p>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#F5F7FA] border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-gray-900">{t("values.title")}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Target, k: "v1" },
              { icon: ShieldCheck, k: "v2" },
              { icon: Heart, k: "v3" },
              { icon: Zap, k: "v4" }
            ].map((v, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex gap-6">
                <div className="w-14 h-14 bg-blue-50 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <v.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t(`values.${v.k}.title`)}</h3>
                  <p className="text-gray-600 leading-relaxed">{t(`values.${v.k}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-primary text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-6">{t("cta.title")}</h2>
          <Button variant="outline" size="lg" className="bg-white text-primary border-none hover:bg-gray-50 px-10 text-lg h-14 rounded-full">
            {t("cta.button")}
          </Button>
        </div>
      </section>
    </PageLayout>
  );
}
