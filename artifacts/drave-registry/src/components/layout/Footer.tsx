import { Link } from "wouter";
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation(['common']);
  const footer = t('footer', { returnObjects: true }) as any;
  const nav = t('nav', { returnObjects: true }) as any;

  return (
    <footer className="bg-[#F8FAFF] pt-16 pb-8 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          
          {/* Column 1 */}
          <div className="lg:col-span-1">
            <img 
              src="https://res.cloudinary.com/dlvffw5wt/image/upload/v1779930051/Secondary_Logo-removebg-preview_nytiyb.png" 
              alt="Drave Registry" 
              className="h-8 w-auto mb-6"
            />
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              {footer.tagline}
            </p>
            <div className="flex space-x-4 text-gray-400">
              <a href="#" className="hover:text-[#0A91F9] transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="hover:text-[#0A91F9] transition-colors"><Linkedin className="w-5 h-5" /></a>
              <a href="#" className="hover:text-[#0A91F9] transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="hover:text-[#0A91F9] transition-colors"><Instagram className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-gray-900 font-bold mb-6">{footer.products}</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/domains" className="hover:text-[#0A91F9] transition-colors">{footer.domainNames}</Link></li>
              <li><Link href="/transfer" className="hover:text-[#0A91F9] transition-colors">{nav.domains}</Link></li>
              <li><Link href="/email" className="hover:text-[#0A91F9] transition-colors">{footer.professionalEmail}</Link></li>
              <li><Link href="/security" className="hover:text-[#0A91F9] transition-colors">{footer.sslCerts}</Link></li>
              <li><Link href="/whois" className="hover:text-[#0A91F9] transition-colors">WHOIS Lookup</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-gray-900 font-bold mb-6">{footer.company}</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/support" className="hover:text-[#0A91F9] transition-colors">{footer.contactUs}</Link></li>
              <li><Link href="/knowledgebase" className="hover:text-[#0A91F9] transition-colors">Knowledgebase</Link></li>
              <li><Link href="/about" className="hover:text-[#0A91F9] transition-colors">{footer.aboutUs}</Link></li>
              <li><Link href="/legal" className="hover:text-[#0A91F9] transition-colors">{footer.privacy}</Link></li>
              <li><Link href="/legal" className="hover:text-[#0A91F9] transition-colors">{footer.terms}</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h4 className="text-gray-900 font-bold mb-6">{nav.clientArea}</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><button className="hover:text-[#0A91F9] transition-colors">Create Account</button></li>
              <li><button className="hover:text-[#0A91F9] transition-colors">{nav.login}</button></li>
              <li><Link href="/dashboard" className="hover:text-[#0A91F9] transition-colors">Dashboard</Link></li>
              <li><Link href="/dashboard/billing" className="hover:text-[#0A91F9] transition-colors">Billing</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            {footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
