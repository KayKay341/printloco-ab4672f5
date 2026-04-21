import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin } from "lucide-react";

const CheckoutReturn = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-2xl py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">
          Payment received — your maker is on it.
        </h1>
        <p className="mt-3 text-muted-foreground">
          We've notified the maker and they'll reach out shortly with a pickup time. You can also
          message them directly from your dashboard.
        </p>
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 text-left shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Receipt
          </div>
          <div className="mt-1 font-mono text-sm break-all">{sessionId ?? "—"}</div>
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
