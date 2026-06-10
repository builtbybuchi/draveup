import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "./button";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export function DomainSearch({
  size = "lg",
  value,
  onChange,
  autoFocus,
  selectAllOnFocus,
  onSearch,
}: {
  size?: "sm" | "lg";
  value?: string;
  onChange?: (v: string) => void;
  autoFocus?: boolean;
  selectAllOnFocus?: boolean;
  onSearch?: (query: string) => void;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['common']);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const query = value ?? internalQuery;
  const setQuery = (v: string) => (onChange ? onChange(v) : setInternalQuery(v));

  useEffect(() => {
    if (!autoFocus) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      if (selectAllOnFocus) inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [autoFocus, selectAllOnFocus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const encodedQuery = encodeURIComponent(query);
      if (onSearch) {
        onSearch(query.trim());
      }
      setLocation(`/domains?search=${encodedQuery}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full group">
      <div className={`relative flex items-center bg-white border border-gray-300 hover:border-[#0A91F9] hover:shadow-md transition-all rounded-full overflow-hidden ${size === "lg" ? "p-2" : "p-1"}`}>
        <Search className={`text-gray-400 ml-4 ${size === "lg" ? "w-6 h-6" : "w-5 h-5"}`} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          ref={inputRef}
          placeholder={t("search.placeholder")}
          className={`flex-grow bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 px-4 ${size === "lg" ? "text-lg h-14" : "text-base h-10"}`}
        />
        <div className="hidden sm:flex items-center px-4 border-l border-gray-200">
          <span className="text-gray-500 font-medium">{t("search.tld")}</span>
        </div>
        <Button type="submit" variant="gradient" size={size === "lg" ? "lg" : "default"} className={`rounded-full ${size === "lg" ? "px-8" : "px-6"}`}>
          {t("search.button")}
        </Button>
      </div>
    </form>
  );
}
