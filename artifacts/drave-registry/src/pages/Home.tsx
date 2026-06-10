import { PageLayout } from "@/components/layout/PageLayout";
import { DomainSearch } from "@/components/ui/DomainSearch";
import { BrandPattern } from "@/components/ui/BrandPattern";
import {
  DomainSearchIllustration,
  EmailIllustration,
  TransferIllustration,
  DashboardIllustration,
  GlobeIllustration,
} from "@/components/ui/Illustrations";
import { motion } from "framer-motion";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Mail,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Shield,
  Briefcase
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useTlds } from "@/hooks/useTlds";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: "easeOut" },
  }),
};

export function Home() {
  const { t } = useTranslation(['home']);
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const [, navigate] = useLocation();
  const [visibleTldCount, setVisibleTldCount] = useState(4);
  const [viewMoreClicks, setViewMoreClicks] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { data: apiTlds = [], isLoading: tldsLoading } = useTlds();
  
  // Fallback email plans
  const emailPlans = [
    { name: "Personal",  accounts: 1,  storage: "5 GB",  price: 0.99,  tag: "Great for individuals" },
    { name: "Bronze",    accounts: 1, storage: "30 GB",    price: 2.99, tag: "Great for small businesses", popular: true },
  ];
  
  // Cast FAQ items from translation
  const faqItems = t('faq.items', { returnObjects: true }) as Array<{q: string, a: string}>;

  const TLDS = apiTlds
    .filter((t: any) => t.priceRegister != null)
    .map((t: any) => ({
      tld: t.ext,
      reg: t.priceRegister,
      renew: t.priceRenew ?? t.priceRegister,
      transfer: t.priceTransfer ?? t.priceRegister,
    }));

  const visibleTlds = TLDS.slice(0, Math.min(visibleTldCount, TLDS.length));

  const handleViewMoreTlds = () => {
    if (viewMoreClicks >= 2) {
      navigate("/domains");
      return;
    }
    setViewMoreClicks((c) => c + 1);
    setVisibleTldCount((c) => c + 4);
  };

  return (
    <PageLayout>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-28 lg:pt-48 lg:pb-36 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A2540]/90 via-[#0A2540]/75 to-[#0A91F9]/60" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-white mb-6"
          >
            {t('hero.title')}
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="max-w-3xl mx-auto">
            <DomainSearch size="lg" />

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[".com", ".net", ".org", ".io", ".dev"].map((tld, i) => (
                <motion.span
                  key={tld}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.07 }}
                  className="px-4 py-1.5 bg-white/20 border border-white/30 rounded-full text-sm font-bold text-white backdrop-blur-sm hover:bg-white/30 cursor-default transition-colors"
                >
                  {tld}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 4-COLUMN FEATURE CARDS (with illustrations) ─────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('services.title')}
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t('services.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Globe,
                href: "/domains",
                title: t('services.domains.title'),
                desc: t('services.domains.subtitle'),
                Illus: DomainSearchIllustration,
              },
              {
                icon: Mail,
                href: "/email",
                title: t('services.email.title'),
                desc: t('services.email.subtitle'),
                Illus: EmailIllustration,
              },
              {
                icon: Briefcase,
                href: "/workspace",
                title: t('services.googleWorkspace.title'),
                desc: t('services.googleWorkspace.subtitle'),
                Illus: DashboardIllustration,
              },
              {
                icon: Shield,
                href: "/security",
                title: t('services.security.title'),
                desc: t('services.security.subtitle'),
                Illus: TransferIllustration,
              },
            ].map(({ icon: Icon, href, title, desc, Illus }, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="group text-center flex"
              >
                <Link href={href} className="block h-full w-full">
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-[#0A91F9] hover:shadow-xl transition-all cursor-pointer h-full flex flex-col">
                    <Illus className="w-full h-36 object-contain mb-6" />
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0A91F9] transition-colors">
                      <Icon className="w-5 h-5 text-[#0A91F9] group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#0A91F9] transition-colors">{title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed flex-1">{desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING TABLE (Domains Section) ────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#F8FBFF]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </motion.div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span>TLD</span>
              <span className="text-center">Register</span>
              <span className="text-center">Renew</span>
              <span className="text-center">Transfer</span>
            </div>
            {visibleTlds.map((row, i) => (
              <motion.div
                key={row.tld}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-blue-50/40 transition-colors"
              >
                <span className="font-bold text-[#0A91F9] text-lg">{row.tld}</span>
                <div className="text-center">
                  <div className="font-bold text-gray-900">{formatPrice(row.reg)}</div>
                  <div className="text-xs text-gray-400">Per Year</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900">{formatPrice(row.renew)}</div>
                  <div className="text-xs text-gray-400">Per Year</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900">{formatPrice(row.transfer)}</div>
                  <div className="text-xs text-gray-400">Per Year</div>
                </div>
              </motion.div>
            ))}
            {TLDS.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500 text-sm">
                {tldsLoading ? "Loading TLD pricing…" : "TLD pricing not configured yet."}
              </div>
            )}
            <div className="flex justify-center py-4">
              <button
                onClick={handleViewMoreTlds}
                className="flex items-center gap-2 text-[#0A91F9] font-bold text-sm hover:underline"
              >
                {viewMoreClicks >= 2 ? "View All TLDs" : "View More"}
                <ChevronDown className="w-4 h-4 transition-transform" />
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link href="/domains">
              <Button className="bg-[#0A91F9] text-white hover:bg-[#0880de] font-bold px-8 py-3 rounded-xl text-base">
                {t('services.domains.cta')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── EMAIL PLANS SECTION ───────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {t('services.email.title')}
              </h2>
              <p className="text-gray-500 text-lg mb-6 leading-relaxed">
                {t('services.email.description')}
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  t('services.email.benefit1'),
                  t('services.email.benefit2'),
                  t('services.email.benefit3'),
                  t('services.email.benefit4'),
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-[#0A91F9] flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/email">
                <Button className="bg-[#0A91F9] text-white hover:bg-[#0880de] font-bold px-8 py-3 rounded-xl">
                  {t('services.email.cta')} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-3"
            >
              {emailPlans.map((plan: any) => (
                <div
                  key={plan.name}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    plan.popular
                      ? "border-[#0A91F9] bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-[#0A91F9]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0A91F9] rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{plan.name}</span>
                        {plan.popular && (
                          <span className="bg-[#0A91F9] text-white text-xs font-bold px-2 py-0.5 rounded-full">Most Popular</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{plan.accounts} accounts · {plan.storage} · {plan.tag}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatPrice(plan.price)}</div>
                      <div className="text-xs text-gray-400">/yr</div>
                    </div>
                    <button
                      onClick={() => addItem({
                        type: "email",
                        name: `${plan.name} Email Plan`,
                        description: `${plan.accounts} accounts · ${plan.storage}`,
                        priceUsd: plan.price,
                        period: 1,
                      })}
                      className="w-8 h-8 bg-[#0A91F9] text-white rounded-lg flex items-center justify-center hover:bg-[#0880de] transition-colors font-bold text-lg flex-shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── GOOGLE WORKSPACE SECTION ─────────────────────── */}
      <section className="relative py-24 bg-[#0A2540] text-white overflow-hidden">
        <BrandPattern variant="white-on-blue" opacity={0.07} rows={9} cols={20} />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {t('services.googleWorkspace.title')}
              </h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                {t('services.googleWorkspace.description')}
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  t('services.googleWorkspace.benefit1'),
                  t('services.googleWorkspace.benefit2'),
                  t('services.googleWorkspace.benefit3'),
                  t('services.googleWorkspace.benefit4'),
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-200">
                    <CheckCircle2 className="w-5 h-5 text-[#0A91F9] flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/workspace">
                <Button className="bg-[#0A91F9] hover:bg-[#0880de] text-white font-bold px-8 py-3 rounded-xl">
                  {t('services.googleWorkspace.cta')} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <DashboardIllustration className="w-full max-w-lg" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── SECURITY SECTION ────────────────────────────────────────────── */}
      <section className="py-24 bg-[#F8FBFF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1 flex justify-center"
            >
              <GlobeIllustration className="w-full max-w-md" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2 text-center lg:text-left"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {t('services.security.title')}
              </h2>
              <p className="text-gray-500 text-lg mb-8">
                {t('services.security.description')}
              </p>
              <ul className="space-y-3 mb-8 text-left inline-block lg:block">
                {[
                  t('services.security.benefit1'),
                  t('services.security.benefit2'),
                  t('services.security.benefit3'),
                  t('services.security.benefit4'),
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <Shield className="w-5 h-5 text-[#0A91F9] flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-center lg:justify-start">
                <Link href="/security">
                  <Button className="bg-[#0A91F9] text-white hover:bg-[#0880de] font-bold px-8 py-3 rounded-xl text-base">
                    {t('services.security.cta')} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('faq.title')}</h2>
          </motion.div>
          <div className="space-y-3">
            {faqItems && faqItems.map((faq: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-4 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA (blue with pattern) ───────────────────────────────── */}
      <section className="relative py-20 bg-[#0A91F9] text-white text-center overflow-hidden">
        <BrandPattern variant="white-on-blue" opacity={0.12} rows={6} cols={20} />
        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t('finalCta.title')}
            </h2>
            <p className="text-blue-100 text-lg mb-8">
              {t('finalCta.subtitle')}
            </p>
            <Link href="/domains">
              <Button className="bg-white text-[#0A91F9] hover:bg-blue-50 font-bold px-10 py-3 rounded-xl text-base">
                {t('services.domains.cta')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

    </PageLayout>
  );
}
