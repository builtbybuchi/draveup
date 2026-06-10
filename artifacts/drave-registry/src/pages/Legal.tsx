import { PageLayout } from "@/components/layout/PageLayout";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

export function Legal() {
  const { t } = useTranslation(['legal', 'common']);

  return (
    <PageLayout>
      <div className="bg-[#F5F7FA] py-16 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">{t("nav.terms")} & Policies</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col md:flex-row gap-12">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-2 sticky top-24">
            {["terms", "privacy", "cookies", "whois", "trust", "abuse"].map((item) => (
              <a 
                key={item} 
                href={`#${item}`}
                className="px-4 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-blue-50 hover:text-primary transition-colors"
              >
                {t(`nav.${item}`)}
              </a>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-grow max-w-3xl prose prose-lg prose-blue">
          
          <div id="terms" className="mb-20 scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t("terms.title")}</h2>
            <p className="text-sm text-gray-500 mb-8">{t("terms.updated")}</p>
            
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t(`terms.s${i}.title`)}</h3>
                <p className="text-gray-600 leading-relaxed">{t(`terms.s${i}.body`)}</p>
              </div>
            ))}
          </div>

          <hr className="my-12 border-gray-200" />

          <div id="privacy" className="mb-20 scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t("privacy.title")}</h2>
            <p className="text-sm text-gray-500 mb-8">{t("privacy.updated")}</p>
            
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t(`privacy.s${i}.title`)}</h3>
                <p className="text-gray-600 leading-relaxed">{t(`privacy.s${i}.body`)}</p>
              </div>
            ))}
          </div>

          <hr className="my-12 border-gray-200" />

          <div id="trust" className="mb-20 scroll-mt-24 bg-[#EFF7FF] p-8 rounded-2xl border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("trust.title")}</h2>
            <p className="text-gray-600 mb-6">{t("trust.subtitle")}</p>
            <h3 className="font-bold text-gray-900 mb-4">{t("trust.certifications")}</h3>
            <ul className="space-y-3">
              <li className="flex items-center text-gray-700"><span className="w-2 h-2 bg-primary rounded-full mr-3"></span>{t("trust.icann")}</li>
              <li className="flex items-center text-gray-700"><span className="w-2 h-2 bg-primary rounded-full mr-3"></span>{t("trust.pci")}</li>
              <li className="flex items-center text-gray-700"><span className="w-2 h-2 bg-primary rounded-full mr-3"></span>{t("trust.ssl")}</li>
              <li className="flex items-center text-gray-700"><span className="w-2 h-2 bg-primary rounded-full mr-3"></span>{t("trust.gdpr")}</li>
            </ul>
          </div>

        </div>
      </div>
    </PageLayout>
  );
}
