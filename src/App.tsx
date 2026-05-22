import { Component, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { VerificationBanner } from "@/components/VerificationBanner";
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
import MakerDashboardSelector from "./pages/MakerDashboardSelector.tsx";
import RoleSelection from "./pages/RoleSelection.tsx";
import Services from "./pages/Services.tsx";
import Order from "./pages/Order.tsx";

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
