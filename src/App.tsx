import { Component, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { VerificationBanner } from "@/components/VerificationBanner";
import AIHelper from "@/components/AIHelper";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Printers from "./pages/Printers.tsx";
import NewPrinter from "./pages/NewPrinter.tsx";
import Upload from "./pages/Upload.tsx";
import Waitlist from "./pages/Waitlist.tsx";
import Invest from "./pages/Invest.tsx";
import CheckoutReturn from "./pages/CheckoutReturn.tsx";
import Admin from "./pages/Admin.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import GiftCards from "./pages/GiftCards.tsx";
import RedeemGiftCard from "./pages/RedeemGiftCard.tsx";
import GiftCardReturn from "./pages/GiftCardReturn.tsx";
import BecomeMaker from "./pages/BecomeMaker.tsx";
import MakerOnboarding from "./pages/MakerOnboarding.tsx";
import MakerOnboardingImages from "./pages/MakerOnboardingImages.tsx";
import MakerOnboardingReview from "./pages/MakerOnboardingReview.tsx";
import MakerOnboardingFinancials from "./pages/MakerOnboardingFinancials.tsx";
import MakerOnboardingComplete from "./pages/MakerOnboardingComplete.tsx";
import MakerWorkspace from "./pages/MakerWorkspace.tsx";
import RoleSelection from "./pages/RoleSelection.tsx";
import Services from "./pages/Services.tsx";
import Order from "./pages/Order.tsx";

const queryClient = new QueryClient();

const RecoveryDiagnostics = () => {
  const diagnostics = (window as Window & { __PRINTLOCO_DIAGNOSTICS__?: { read: () => Array<{ id: string; time: string; type: string; message: string }> } }).__PRINTLOCO_DIAGNOSTICS__?.read?.() ?? [];
  const recent = diagnostics.slice(-6).reverse();

  if (!recent.length) return null;

  return (
    <details className="mt-6 text-left" open>
      <summary className="cursor-pointer text-sm font-semibold text-foreground">Recent diagnostics</summary>
      <ul className="mt-3 max-h-64 space-y-3 overflow-auto rounded-xl border border-border bg-background p-4">
        {recent.map((item) => (
          <li key={item.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
              <span>{item.type}</span>
              <span className="text-muted-foreground">{new Date(item.time).toLocaleString()}</span>
            </div>
            <code className="mt-2 block whitespace-pre-wrap break-words text-xs text-muted-foreground">{item.message}</code>
          </li>
        ))}
      </ul>
    </details>
  );
};

const AppFallback = () => (
  <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-card text-center">
      <h1 className="font-display text-3xl font-semibold">This page hit a snag</h1>
      <p className="mt-3 text-sm text-muted-foreground">The page stayed visible and captured what went wrong below.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Reload page
        </button>
        <a
          href="/"
          className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground"
        >
          Go home
        </a>
      </div>
      <RecoveryDiagnostics />
    </section>
  </main>
);

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page render failed", error, info);
    window.setTimeout(() => {
      (window as Window & { __PRINTLOCO_RECOVER__?: (reason?: unknown) => void }).__PRINTLOCO_RECOVER__?.(error);
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      return <AppFallback />;
    }

    return this.props.children;
  }
}

const SafePage = ({ component: Component }: { component: ComponentType }) => (
  <PageErrorBoundary>
    <Component />
  </PageErrorBoundary>
);

const routeElement = (component: ComponentType) => <SafePage component={component} />;

const FatalAppFallback = () => (
  <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-card text-center">
      <h1 className="font-display text-3xl font-semibold">PrintLoco didn’t start</h1>
      <p className="mt-3 text-sm text-muted-foreground">The app stayed visible and captured startup diagnostics below.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        Reload page
      </button>
      <RecoveryDiagnostics />
    </section>
  </main>
);

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render failed", error, info);
    window.setTimeout(() => {
      (window as Window & { __PRINTLOCO_RECOVER__?: (reason?: unknown) => void }).__PRINTLOCO_RECOVER__?.(error);
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      return <FatalAppFallback />;
    }

    return this.props.children;
  }
}

const AppRoutes = () => {
  return (
      <Routes>
        <Route path="/" element={routeElement(Index)} />
        <Route path="/auth" element={routeElement(Auth)} />
        <Route path="/dashboard" element={routeElement(Dashboard)} />
        <Route path="/printers" element={routeElement(Printers)} />
        <Route path="/printers/new" element={routeElement(NewPrinter)} />
        <Route path="/upload" element={routeElement(Upload)} />
        <Route path="/services" element={routeElement(Services)} />
        <Route path="/order/:service" element={routeElement(Order)} />
        <Route path="/waitlist" element={routeElement(Waitlist)} />
        <Route path="/invest" element={routeElement(Invest)} />
        <Route path="/checkout/return" element={routeElement(CheckoutReturn)} />
        <Route path="/admin" element={routeElement(Admin)} />
        <Route path="/unsubscribe" element={routeElement(Unsubscribe)} />
        <Route path="/reset-password" element={routeElement(ResetPassword)} />
        <Route path="/gift-cards" element={routeElement(GiftCards)} />
        <Route path="/gift-cards/redeem" element={routeElement(RedeemGiftCard)} />
        <Route path="/gift-cards/return" element={routeElement(GiftCardReturn)} />
        <Route path="/become-a-maker" element={routeElement(BecomeMaker)} />
        <Route path="/become-a-maker/:service" element={routeElement(BecomeMaker)} />
        <Route path="/onboarding/maker" element={routeElement(MakerOnboarding)} />
        <Route path="/onboarding/images" element={routeElement(MakerOnboardingImages)} />
        <Route path="/onboarding/review" element={routeElement(MakerOnboardingReview)} />
        <Route path="/onboarding/financials" element={routeElement(MakerOnboardingFinancials)} />
        <Route path="/onboarding/complete" element={routeElement(MakerOnboardingComplete)} />
        <Route path="/maker" element={routeElement(MakerWorkspace)} />
        <Route path="/maker/dashboard-selector" element={routeElement(MakerWorkspace)} />
        <Route path="/onboarding/role" element={routeElement(RoleSelection)} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={routeElement(NotFound)} />
      </Routes>
  );
};

const App = () => {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

const AppContent = () => {
  const { profile } = useAuth();
  // Mock verification check until backend field is added
  const isVerified = profile ? true : true; 

  return (
    <>
      <VerificationBanner isVisible={!isVerified} />
      <PaymentTestModeBanner />
      <DemoModeBanner />
      <AppRoutes />
      <AIHelper />
    </>
  );
};

export default App;
