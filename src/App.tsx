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
const RoleSelection = lazy(() => import("./pages/RoleSelection.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
const Order = lazy(() => import("./pages/Order.tsx"));

const queryClient = new QueryClient();

const AppFallback = () => (
  <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card text-center">
      <h1 className="font-display text-3xl font-semibold">Something didn’t load</h1>
      <p className="mt-3 text-sm text-muted-foreground">Reload the page to try again.</p>
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
      return <AppFallback />;
    }

    return this.props.children;
  }
}

const AppRoutes = () => {
  return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/printers" element={<Printers />} />
        <Route path="/printers/new" element={<NewPrinter />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/services" element={<Services />} />
        <Route path="/order/:service" element={<Order />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/invest" element={<Invest />} />
        <Route path="/checkout/return" element={<CheckoutReturn />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/gift-cards" element={<GiftCards />} />
        <Route path="/gift-cards/redeem" element={<RedeemGiftCard />} />
        <Route path="/gift-cards/return" element={<GiftCardReturn />} />
        <Route path="/become-a-maker" element={<BecomeMaker />} />
        <Route path="/become-a-maker/:service" element={<BecomeMaker />} />
        <Route path="/onboarding/maker" element={<MakerOnboarding />} />
        <Route path="/onboarding/images" element={<MakerOnboardingImages />} />
        <Route path="/onboarding/review" element={<MakerOnboardingReview />} />
        <Route path="/onboarding/financials" element={<MakerOnboardingFinancials />} />
        <Route path="/onboarding/complete" element={<MakerOnboardingComplete />} />
        <Route path="/maker/dashboard-selector" element={<MakerDashboardSelector />} />
        <Route path="/onboarding/role" element={<RoleSelection />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
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
          <BrowserRouter>
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
    </>
  );
};

export default App;
