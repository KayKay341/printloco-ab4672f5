import { Component, Suspense, lazy, type ComponentType, type ErrorInfo, type LazyExoticComponent, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { VerificationBanner } from "@/components/VerificationBanner";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Printers = lazy(() => import("./pages/Printers.tsx"));
const NewPrinter = lazy(() => import("./pages/NewPrinter.tsx"));
const Upload = lazy(() => import("./pages/Upload.tsx"));
const Waitlist = lazy(() => import("./pages/Waitlist.tsx"));
const Invest = lazy(() => import("./pages/Invest.tsx"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const GiftCards = lazy(() => import("./pages/GiftCards.tsx"));
const RedeemGiftCard = lazy(() => import("./pages/RedeemGiftCard.tsx"));
const GiftCardReturn = lazy(() => import("./pages/GiftCardReturn.tsx"));
const BecomeMaker = lazy(() => import("./pages/BecomeMaker.tsx"));
const MakerOnboarding = lazy(() => import("./pages/MakerOnboarding.tsx"));
const MakerOnboardingImages = lazy(() => import("./pages/MakerOnboardingImages.tsx"));
const MakerOnboardingReview = lazy(() => import("./pages/MakerOnboardingReview.tsx"));
const MakerOnboardingFinancials = lazy(() => import("./pages/MakerOnboardingFinancials.tsx"));
const MakerOnboardingComplete = lazy(() => import("./pages/MakerOnboardingComplete.tsx"));
const MakerDashboardSelector = lazy(() => import("./pages/MakerDashboardSelector.tsx"));
const MakerWorkspace = lazy(() => import("./pages/MakerWorkspace.tsx"));
const RoleSelection = lazy(() => import("./pages/RoleSelection.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
const Order = lazy(() => import("./pages/Order.tsx"));

const queryClient = new QueryClient();

const PageLoading = () => (
  <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
      <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
      Loading PrintLoco…
    </div>
  </main>
);

const AppFallback = () => (
  <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card text-center">
      <h1 className="font-display text-3xl font-semibold">This page hit a snag</h1>
      <p className="mt-3 text-sm text-muted-foreground">The rest of the site is still available. Reload this page or go home.</p>
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
  }

  render() {
    if (this.state.hasError) {
      return <AppFallback />;
    }

    return this.props.children;
  }
}

const SafePage = ({ component: Component }: { component: LazyExoticComponent<ComponentType> }) => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  </PageErrorBoundary>
);

const routeElement = (component: LazyExoticComponent<ComponentType>) => <SafePage component={component} />;

const FatalAppFallback = () => (
  <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card text-center">
      <h1 className="font-display text-3xl font-semibold">PrintLoco didn’t start</h1>
      <p className="mt-3 text-sm text-muted-foreground">Reload the app to try again.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        Reload page
      </button>
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
        <Route path="/maker/dashboard-selector" element={routeElement(MakerDashboardSelector)} />
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
      <Suspense fallback={<PageLoading />}>
        <AppRoutes />
      </Suspense>
    </>
  );
};

export default App;
