import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { DemoModeBanner } from "@/components/DemoModeBanner";
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
import RoleSelection from "./pages/RoleSelection.tsx";
import Services from "./pages/Services.tsx";
import Order from "./pages/Order.tsx";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
        <Route path="/onboarding/role" element={<RoleSelection />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { VerificationBanner } from "@/components/VerificationBanner";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
// ...

const App = () => {
  return (
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
      <AnimatedRoutes />
    </>
  );
};

export default App;
