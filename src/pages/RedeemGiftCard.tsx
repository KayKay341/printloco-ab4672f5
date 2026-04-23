import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Gift, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function RedeemGiftCard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    redeemedAmountCents: number;
    newBalanceCents: number;
  } | null>(null);

  useEffect(() => {
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
  }, [params]);

  const handleRedeem = async () => {
    if (!user) {
      navigate(`/auth?mode=signin&redirect=/gift-cards/redeem${code ? `?code=${encodeURIComponent(code)}` : ""}`);
      return;
    }
    if (!code.trim()) {
      toast.error("Enter your gift card code");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-giftcard", {
        body: { code: code.trim().toUpperCase() },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Could not redeem");
      setResult({
        redeemedAmountCents: data.redeemedAmountCents,
        newBalanceCents: data.newBalanceCents,
      });
      toast.success(`Added ${formatUsd(data.redeemedAmountCents)} to your account`);
    } catch (e: any) {
      toast.error(e.message || "Could not redeem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container max-w-xl py-16 md:py-24">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent/10 text-accent">
            <Gift className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">
            Redeem a gift card
          </h1>
          <p className="mt-3 text-muted-foreground">
            Enter your code to add the balance to your PrintLoco account. It'll be applied
            automatically the next time you check out.
          </p>
        </div>

        {!result ? (
          <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
            <Label htmlFor="code" className="text-sm font-medium">
              Gift card code
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="PL-XXXX-XXXX-XXXX"
              className="mt-2 font-mono tracking-widest"
              autoComplete="off"
              autoCapitalize="characters"
            />
            <Button
              variant="hero"
              size="lg"
              className="mt-5 w-full"
              disabled={submitting || authLoading || !code.trim()}
              onClick={handleRedeem}
            >
              {submitting
                ? "Redeeming…"
                : !user
                ? "Sign in to redeem"
                : "Redeem to my account"}
            </Button>
            {!user && !authLoading && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                You'll need an account so we can store the balance for you. We'll bring you right back.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-accent/30 bg-accent/5 p-8 text-center shadow-soft">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent text-accent-foreground">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold">
              Boom — {formatUsd(result.redeemedAmountCents)} added!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your new account balance is{" "}
              <strong className="text-foreground">{formatUsd(result.newBalanceCents)}</strong>
              . It'll auto-apply at checkout on your next print.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="hero" asChild>
                <Link to="/upload">
                  Upload a print <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
