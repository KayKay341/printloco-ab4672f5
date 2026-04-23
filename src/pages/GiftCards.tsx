import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Gift, Mail, ArrowRight, Sparkles, Heart } from "lucide-react";

import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

const QUICK_AMOUNTS = [25, 50, 100, 250];
const MIN_USD = 5;
const MAX_USD = 500;

export default function GiftCards() {
  const { user } = useAuth();

  const [amountUsd, setAmountUsd] = useState<number>(50);
  const [delivery, setDelivery] = useState<"recipient" | "buyer">("recipient");
  const [purchaserEmail, setPurchaserEmail] = useState(user?.email ?? "");
  const [purchaserName, setPurchaserName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !purchaserEmail) setPurchaserEmail(user.email);
  }, [user]);

  const amountCents = useMemo(() => Math.round(amountUsd * 100), [amountUsd]);

  const valid =
    amountUsd >= MIN_USD &&
    amountUsd <= MAX_USD &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(purchaserEmail) &&
    (delivery === "buyer" ||
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail));

  const startCheckout = async () => {
    setError(null);
    if (!valid) {
      toast.error("Please complete the form first");
      return;
    }
    setLoading(true);
    try {
      const returnUrl = `${window.location.origin}/gift-cards/return?session_id={CHECKOUT_SESSION_ID}`;
      const { data, error } = await supabase.functions.invoke(
        "create-giftcard-checkout",
        {
          body: {
            amountCents,
            purchaserEmail,
            purchaserName: purchaserName || undefined,
            deliveryMethod: delivery,
            recipientEmail: delivery === "recipient" ? recipientEmail : undefined,
            recipientName: delivery === "recipient" ? recipientName || undefined : undefined,
            personalMessage: personalMessage || undefined,
            returnUrl,
            environment: getStripeEnvironment(),
          },
        },
      );
      if (error || !data?.clientSecret) {
        throw new Error(error?.message || data?.error || "Could not start checkout");
      }
      setClientSecret(data.clientSecret as string);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientSecret = async (): Promise<string> => {
    if (clientSecret) return clientSecret;
    throw new Error("No client secret");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="PrintLoco Gift Cards — Give the Gift of Local 3D Printing"
        description="Send a PrintLoco gift card by email. Custom amounts $5–$500, no expiration, redeemable across every verified local maker on PrintLoco."
        path="/gift-cards"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "PrintLoco Gift Card",
          description: "Digital gift card redeemable for 3D printing services from local makers on PrintLoco.",
          brand: { "@type": "Brand", name: "PrintLoco" },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: "5",
            highPrice: "500",
            availability: "https://schema.org/InStock",
            url: "https://printloco.shop/gift-cards",
          },
        }}
      />
      <Navbar />

      <main className="container max-w-5xl py-14 md:py-20">
        {/* Hero */}
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground">
              <Gift className="h-3.5 w-3.5" /> Give the gift of local print
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              PrintLoco gift cards
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              The perfect gift for makers, hobbyists, designers, and anyone who's ever
              said "I wish I could 3D print that." Redeemable across every local maker
              on PrintLoco — no expiration, no fees.
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 text-accent" />
                Delivered by email — instantly or scheduled to land on the right day.
              </li>
              <li className="flex items-start gap-2">
                <Heart className="mt-0.5 h-4 w-4 text-accent" />
                Supports a real local maker every time it's redeemed.
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-accent" />
                Recipient redeems the code → balance is added to their account.
              </li>
            </ul>
            <div className="mt-6">
              <Button variant="ghost" asChild>
                <Link to="/gift-cards/redeem">
                  Have a code? Redeem it <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Visual gift-card preview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto w-full max-w-sm"
          >
            <div className="relative rounded-3xl bg-gradient-to-br from-accent via-accent/90 to-primary p-6 text-primary-foreground shadow-soft">
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl font-semibold">
                  Print<span className="opacity-80">Loco</span>
                </span>
                <Gift className="h-6 w-6 opacity-80" />
              </div>
              <div className="mt-10">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
                  Gift card value
                </div>
                <div className="font-display text-5xl font-semibold tracking-tight">
                  ${amountUsd.toFixed(0)}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs opacity-80">
                <span className="font-mono tracking-widest">PL-•••• •••• ••••</span>
                <span>No expiry</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Builder */}
        <section className="mt-14 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
            <h2 className="font-display text-2xl font-semibold">Design your gift</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick an amount, write a message, and choose how it gets delivered.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <Label className="text-sm font-medium">Amount</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmountUsd(a)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        amountUsd === a
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-background text-foreground hover:border-accent/50"
                      }`}
                    >
                      ${a}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Custom</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min={MIN_USD}
                      max={MAX_USD}
                      step="1"
                      value={amountUsd}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setAmountUsd(Number.isFinite(n) ? n : 0);
                      }}
                      className="w-32 pl-6"
                    />
                  </div>
                </div>
                {(amountUsd < MIN_USD || amountUsd > MAX_USD) && (
                  <p className="mt-1 text-xs text-destructive">
                    Amount must be between ${MIN_USD} and ${MAX_USD}.
                  </p>
                )}
              </div>

              <Tabs value={delivery} onValueChange={(v) => setDelivery(v as any)}>
                <Label className="text-sm font-medium">Delivery</Label>
                <TabsList className="mt-2 grid w-full grid-cols-2">
                  <TabsTrigger value="recipient">Email to recipient</TabsTrigger>
                  <TabsTrigger value="buyer">Send code to me</TabsTrigger>
                </TabsList>

                <TabsContent value="recipient" className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="recipientName">Recipient name (optional)</Label>
                      <Input
                        id="recipientName"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Alex"
                      />
                    </div>
                    <div>
                      <Label htmlFor="recipientEmail">Recipient email</Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="alex@example.com"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll email them the code as soon as your payment goes through.
                  </p>
                </TabsContent>

                <TabsContent value="buyer" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    We'll email the gift code to you so you can hand it off however you like.
                  </p>
                </TabsContent>
              </Tabs>

              <div>
                <Label htmlFor="personalMessage">Personal message (optional)</Label>
                <Textarea
                  id="personalMessage"
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value.slice(0, 500))}
                  placeholder="Happy birthday — go print something cool!"
                  rows={3}
                  maxLength={500}
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {personalMessage.length}/500
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="purchaserName">Your name (optional)</Label>
                  <Input
                    id="purchaserName"
                    value={purchaserName}
                    onChange={(e) => setPurchaserName(e.target.value)}
                    placeholder="Jordan"
                  />
                </div>
                <div>
                  <Label htmlFor="purchaserEmail">Your email (for receipt)</Label>
                  <Input
                    id="purchaserEmail"
                    type="email"
                    value={purchaserEmail}
                    onChange={(e) => setPurchaserEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary / checkout */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
            <h3 className="font-display text-xl font-semibold">Order summary</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Gift card</dt>
                <dd className="font-medium">${amountUsd.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fees</dt>
                <dd className="font-medium">$0.00</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-display text-xl font-semibold">${amountUsd.toFixed(2)}</dd>
              </div>
            </dl>

            {!clientSecret ? (
              <>
                <Button
                  variant="hero"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={!valid || loading}
                  onClick={startCheckout}
                >
                  {loading ? "Starting checkout…" : "Continue to payment"}
                </Button>
                {error && (
                  <p className="mt-3 text-sm text-destructive">{error}</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Secure checkout powered by Stripe. Your card is never stored on PrintLoco.
                </p>
              </>
            ) : (
              <div className="mt-6">
                <div id="checkout">
                  <EmbeddedCheckoutProvider
                    key={clientSecret}
                    stripe={getStripe()}
                    options={{ fetchClientSecret }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => setClientSecret(null)}
                >
                  ← Edit details
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
