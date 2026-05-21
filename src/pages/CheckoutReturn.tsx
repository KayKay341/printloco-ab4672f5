import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, Sparkles } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useMemo } from "react";

const CheckoutReturn = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const isDemoReturn = params.get("demo") === "1";
  const orderId = params.get("order");
  const { demoOrders } = useDemoMode();
  const order = useMemo(() => demoOrders.find((o) => o.id === orderId), [demoOrders, orderId]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Order Confirmed — PrintLoco" description="Thanks! Your PrintLoco order is confirmed. Your local maker will start work shortly and we'll keep you posted on progress and pickup details." path="/checkout/return" noindex />
      <Navbar />
      <main className="container max-w-2xl py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">
          {isDemoReturn ? "Demo order placed — your maker is on it." : "Payment received — your maker is on it."}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {isDemoReturn
            ? "Watch the status auto-advance from Paid → Accepted → Printing → Ready in your dashboard."
            : "We've notified the maker and they'll reach out shortly with a pickup time."}
        </p>
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 text-left shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isDemoReturn && <Sparkles className="h-3 w-3 text-accent" />}
            Receipt
          </div>
          <div className="mt-1 font-mono text-sm break-all">{orderId ?? sessionId ?? "—"}</div>
          {order && (
            <div className="mt-3 grid gap-1 text-sm">
              <div><strong>Printer:</strong> {order.printerLabel}</div>
              <div><strong>Maker:</strong> {order.makerName}</div>
              <div><strong>Material:</strong> {order.material}{order.colorName ? ` · ${order.colorName}` : ""}</div>
              <div><strong>Total:</strong> ${(order.amountCents / 100).toFixed(2)}</div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Pickup details will appear in your dashboard.
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="hero" size="lg" asChild>
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutReturn;
