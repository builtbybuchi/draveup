import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { MessageSquare, Phone, Ticket, BookOpen, CheckCircle2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function Support() {
  const { t } = useTranslation(['support', 'common']);

  return (
    <PageLayout>
      <section className="pt-24 pb-16 text-center px-4 bg-[#F5F7FA] border-b border-gray-200">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900">{t("hero.title")}</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {t("hero.subtitle")}
        </p>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: MessageSquare, k: "chat" },
              { icon: Phone, k: "phone" },
              { icon: Ticket, k: "ticket" },
              { icon: BookOpen, k: "kb" }
            ].map((channel, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer flex flex-col">
                <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                  <channel.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t(`channels.${channel.k}.title`)}</h3>
                <p className="text-gray-600 text-sm mb-8 flex-grow">{t(`channels.${channel.k}.desc`)}</p>
                <Button variant="outline" className="w-full border-gray-300 group-hover:border-primary group-hover:text-primary">{t(`channels.${channel.k}.cta`)}</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#F5F7FA] border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{t("faq.title")}</h2>
          <Accordion type="single" collapsible className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b-0 px-4">
                <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-primary py-4 text-lg">
                  {t(`faq.q${i}`)}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base leading-relaxed pb-4">
                  {t(`faq.a${i}`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-20 bg-white text-center border-b border-gray-200">
         <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("status.title")}</h2>
            <div className="bg-[#F5F7FA] p-6 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div className="text-left">
                <div className="font-bold text-gray-900">API Servers</div>
                <div className="text-sm text-gray-500">Normal</div>
              </div>
              <CheckCircle2 className="text-green-500 w-6 h-6" />
            </div>
            <div className="bg-[#F5F7FA] p-6 rounded-2xl border border-gray-200 flex items-center justify-between mt-4">
              <div className="text-left">
                <div className="font-bold text-gray-900">Control Panel</div>
                <div className="text-sm text-gray-500">Normal</div>
              </div>
              <CheckCircle2 className="text-green-500 w-6 h-6" />
            </div>
         </div>
      </section>

      <section className="py-24 bg-primary text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-10">{t("cta.subtitle")}</p>
          <Button variant="outline" size="lg" className="bg-white text-primary border-none hover:bg-gray-50 px-10 text-lg h-14 rounded-full">
            {t("cta.button")}
          </Button>
        </div>
      </section>
    </PageLayout>
  );
}
