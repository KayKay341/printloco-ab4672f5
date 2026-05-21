import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Gift, ArrowRight } from "lucide-react";

import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

export default function GiftCardReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Gift Sent — PrintLoco" description="Your PrintLoco gift card purchase is confirmed. The recipient will receive their code by email and can redeem it on any local 3D printing, laser cutting, or embroidery order." path="/gift-cards/return" noindex />
      <Navbar />
      <main className="container max-w-2xl py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-accent/10 text-accent">
          <Gift className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">
          Gift sent! 🎁
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your payment is in. We've emailed your receipt and (if you chose to send to a
          recipient) the gift code is on its way to them now.
        </p>
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 text-left shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Payment confirmed
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Receipt reference
          </div>
          <div className="mt-1 break-all font-mono text-sm">{sessionId ?? "—"}</div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="hero" size="lg" asChild>
            <Link to="/gift-cards">
              Buy another <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
