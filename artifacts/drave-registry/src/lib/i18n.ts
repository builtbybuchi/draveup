import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// EN
import enCommon from '@/locales/en/common.json';
import enHome from '@/locales/en/home.json';
import enDomains from '@/locales/en/domains.json';
import enEmail from '@/locales/en/email.json';
import enSecurity from '@/locales/en/security.json';
import enSupport from '@/locales/en/support.json';
import enAbout from '@/locales/en/about.json';
import enLegal from '@/locales/en/legal.json';
import enTransfer from '@/locales/en/transfer.json';
import enWhois from '@/locales/en/whois.json';
import enCheckout from '@/locales/en/checkout.json';
import enDashboard from '@/locales/en/dashboard.json';

// FR
import frCommon from '@/locales/fr/common.json';
import frHome from '@/locales/fr/home.json';
import frDomains from '@/locales/fr/domains.json';
import frEmail from '@/locales/fr/email.json';
import frSecurity from '@/locales/fr/security.json';
import frSupport from '@/locales/fr/support.json';
import frAbout from '@/locales/fr/about.json';
import frLegal from '@/locales/fr/legal.json';
import frTransfer from '@/locales/fr/transfer.json';
import frWhois from '@/locales/fr/whois.json';
import frCheckout from '@/locales/fr/checkout.json';
import frDashboard from '@/locales/fr/dashboard.json';

// DE
import deCommon from '@/locales/de/common.json';
import deHome from '@/locales/de/home.json';
import deDomains from '@/locales/de/domains.json';
import deEmail from '@/locales/de/email.json';
import deSecurity from '@/locales/de/security.json';
import deSupport from '@/locales/de/support.json';
import deAbout from '@/locales/de/about.json';
import deLegal from '@/locales/de/legal.json';
import deTransfer from '@/locales/de/transfer.json';
import deWhois from '@/locales/de/whois.json';
import deCheckout from '@/locales/de/checkout.json';
import deDashboard from '@/locales/de/dashboard.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        home: enHome,
        domains: enDomains,
        email: enEmail,
        security: enSecurity,
        support: enSupport,
        about: enAbout,
        legal: enLegal,
        transfer: enTransfer,
        whois: enWhois,
        checkout: enCheckout,
        dashboard: enDashboard,
      },
      fr: {
        common: frCommon,
        home: frHome,
        domains: frDomains,
        email: frEmail,
        security: frSecurity,
        support: frSupport,
        about: frAbout,
        legal: frLegal,
        transfer: frTransfer,
        whois: frWhois,
        checkout: frCheckout,
        dashboard: frDashboard,
      },
      de: {
        common: deCommon,
        home: deHome,
        domains: deDomains,
        email: deEmail,
        security: deSecurity,
        support: deSupport,
        about: deAbout,
        legal: deLegal,
        transfer: deTransfer,
        whois: deWhois,
        checkout: deCheckout,
        dashboard: deDashboard,
      },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
