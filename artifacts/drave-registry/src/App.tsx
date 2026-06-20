import React, { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";

import { CurrencyProvider } from "@/context/CurrencyContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CartDrawer } from "@/components/layout/CartDrawer";
import "@/lib/i18n";

import { Home } from "@/pages/Home";
import { Domains } from "@/pages/Domains";
import { Email } from "@/pages/Email";
import { Transfer } from "@/pages/Transfer";
import { Whois } from "@/pages/Whois";
import { Dashboard } from "@/pages/Dashboard";
import { Checkout } from "@/pages/Checkout";
import { Support } from "@/pages/Support";
import { About } from "@/pages/About";
import { Legal } from "@/pages/Legal";
import { Security } from "@/pages/Security";
import { ExchangeRateInfo } from "@/pages/ExchangeRateInfo";
import { BlogList } from "@/pages/BlogList";
import { BlogPost } from "@/pages/BlogPost";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  variables: {
    colorPrimary: "#0A91F9",
    colorBackground: "#ffffff",
    fontFamily: "Quicksand, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    headerTitle: { display: "none" },
    headerSubtitle: { display: "none" },
    card: { boxShadow: "0 4px 24px rgba(10,145,249,0.10)", border: "1px solid #e5eaf0" },
    formButtonPrimary: { backgroundColor: "#0A91F9", fontFamily: "Quicksand, sans-serif", fontWeight: "700" },
  },
};

function AuthPageWrapper({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-[#F8FBFF] flex flex-col">
      <div className="flex justify-center pt-8 pb-4">
        <button onClick={() => navigate('/')} className="flex items-center">
          <img
            src="https://res.cloudinary.com/dlvffw5wt/image/upload/v1779930051/Secondary_Logo-removebg-preview_nytiyb.png"
            alt="DraveUp"
            className="h-9 w-auto"
          />
        </button>
      </div>
      <div className="flex flex-col items-center px-4 pb-16">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{title}</h1>
        <p className="text-gray-500 text-sm mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageWrapper title="Sign in to DraveUp" subtitle="Welcome back! Please sign in to continue.">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={clerkAppearance}
      />
    </AuthPageWrapper>
  );
}

function SignUpPage() {
  return (
    <AuthPageWrapper title="Create your DraveUp account" subtitle="Register, transfer & manage domains at cost price.">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        appearance={clerkAppearance}
      />
    </AuthPageWrapper>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/domains" component={Domains} />
      <Route path="/email" component={Email} />
      <Route path="/transfer" component={Transfer} />
      <Route path="/whois" component={Whois} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/:section" component={Dashboard} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/support" component={Support} />
      <Route path="/knowledgebase" component={BlogList} />
      <Route path="/knowledgebase/:slug" component={BlogPost} />
      <Route path="/about" component={About} />
      <Route path="/legal" component={Legal} />
      <Route path="/security" component={Security} />
      <Route path="/exchange-rates" component={ExchangeRateInfo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AuthProvider>
          <CartProvider>
            <CurrencyProvider>
              <TooltipProvider>
                <Router />
                <CartDrawer />
                <Toaster />
              </TooltipProvider>
            </CurrencyProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
