import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown, Menu, X, ShoppingCart, User, LogOut, LayoutDashboard, Globe2, Mail } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [location, navigate] = useLocation();
  const { i18n } = useTranslation(['common']);
  const { currency, currencies, setCurrencyCode } = useCurrency();
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems, openCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!userDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userDropdownOpen]);

  const navLinks = [
    { href: "/domains", label: "Domains" },
    { href: "/email", label: "Email" },
    { href: "/transfer", label: "Transfer Domain" },
    { href: "/whois", label: "WHOIS" },
    { href: "/knowledgebase", label: "Knowledgebase" },
  ];

  const dropdownNav = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard", icon: Globe2, label: "My Domains" },
    { href: "/dashboard", icon: Mail, label: "My Emails" },
  ];

  function handleDropdownNav(href: string) {
    setUserDropdownOpen(false);
    navigate(href);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center group">
            <img
              src="https://res.cloudinary.com/dlvffw5wt/image/upload/v1779930051/Secondary_Logo-removebg-preview_nytiyb.png"
              alt="DraveUp - domain, email and AI-website builder"
              className="h-8 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-semibold rounded-lg transition-colors",
                  location === link.href
                    ? "text-[#0A91F9] bg-blue-50"
                    : "text-gray-700 hover:text-[#0A91F9] hover:bg-gray-50"
                )}
              >{link.label}</Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-2">

            {/* Language Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <Globe className="w-4 h-4" />
                <span className="uppercase">{i18n.language.substring(0, 2)}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2 flex flex-col gap-1 z-50">
                {[['en', 'English'], ['fr', 'Français'], ['de', 'Deutsch']].map(([code, label]) => (
                  <button key={code} onClick={() => i18n.changeLanguage(code)}
                    className={cn("text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors",
                      i18n.language.startsWith(code) ? "text-[#0A91F9] font-semibold" : "text-gray-700")}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Currency Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <span>{currency.flag}</span>
                <span>{currency.code}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2 grid grid-cols-2 gap-1 max-h-64 overflow-y-auto z-50">
                {currencies.map((c) => (
                  <button key={c.code} onClick={() => setCurrencyCode(c.code)}
                    className={cn("flex items-center gap-2 px-2 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors",
                      currency.code === c.code ? "bg-blue-50 text-[#0A91F9] font-bold" : "text-gray-700")}
                  >
                    <span>{c.flag}</span><span>{c.code}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart */}
            <button onClick={openCart} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#0A91F9] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            {/* Auth */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(prev => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-[#0A91F9] rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.firstName[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 hidden xl:block">{user.username}</span>
                  <ChevronDown className={cn("w-3 h-3 text-gray-500 transition-transform", userDropdownOpen && "rotate-180")} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-bold text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <p className="text-xs text-green-600 font-semibold mt-0.5">Balance: ${user.balance.toFixed(2)}</p>
                    </div>
                    {dropdownNav.map(({ href, icon: Icon, label }) => (
                      <button
                        key={label}
                        onClick={() => handleDropdownNav(href)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-left"
                      >
                        <Icon className="w-4 h-4 text-gray-400" />{label}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setUserDropdownOpen(false); }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/sign-in')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <User className="w-4 h-4" />Log In
                </button>
                <button onClick={() => navigate('/sign-up')} className="px-3 py-1.5 text-sm font-semibold bg-[#0A91F9] text-white rounded-lg hover:bg-[#0880de] transition-colors">
                  Create Account
                </button>
              </div>
            )}
          </div>

          {/* Mobile: Cart + Menu */}
          <div className="flex lg:hidden items-center gap-2">
            <button onClick={openCart} className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-[#0A91F9] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalItems}</span>}
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-2 shadow-lg">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
              className={cn("block px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors",
                location === link.href ? "text-[#0A91F9] bg-blue-50" : "text-gray-700 hover:bg-gray-50")}
            >{link.label}</Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">Dashboard</button>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg">Log Out</button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate('/sign-in'); setMobileMenuOpen(false); }} className="block w-full text-center px-4 py-2.5 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50">Log In</button>
                <button onClick={() => { navigate('/sign-up'); setMobileMenuOpen(false); }} className="block w-full text-center px-4 py-2.5 text-sm font-semibold bg-[#0A91F9] text-white rounded-lg hover:bg-[#0880de]">Create Account</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
