import { Component, ErrorInfo, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Printers from "./pages/Printers.tsx";
import MachineEditor from "./pages/MachineEditor.tsx";
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
import Services from "./pages/Services.tsx";
import Order from "./pages/Order.tsx";
import ServicePrinters from "./pages/ServicePrinters.tsx";
import AIAssistant from "./components/AIAssistant";

const queryClient = new QueryClient();

class GlobalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("App crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold font-display">Oops! Something went wrong.</h1>
          <p className="mt-2 text-muted-foreground max-w-md">
            The application encountered an unexpected error. Don't worry, your data is safe.
          </p>
          <div className="mt-6 w-full max-w-lg rounded-xl border border-border bg-muted/30 p-4 text-left font-mono text-[10px] overflow-auto max-h-48">
            <div className="font-bold text-destructive mb-1">{this.state.error?.name}: {this.state.error?.message}</div>
            {this.state.error?.stack}
          </div>
          <Button className="mt-8 h-12 rounded-xl px-8 font-semibold" onClick={() => window.location.assign("/")}>
            Back to Home
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/printers" element={<Printers />} />
        <Route path="/printers/new" element={<MachineEditor />} />
        <Route path="/printers/edit/:id" element={<MachineEditor />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/services" element={<Services />} />
        <Route path="/order/:service" element={<Order />} />
        <Route path="/printers/:serviceId" element={<ServicePrinters />} />
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
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PaymentTestModeBanner />
            <DemoModeBanner />
            <AnimatedRoutes />
            <AIAssistant />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </GlobalErrorBoundary>
  </QueryClientProvider>
);

export default App;
