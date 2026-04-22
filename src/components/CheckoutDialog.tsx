import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface CheckoutPayload {
  printerId: string;
  stlFileId?: string | null;
  makerId: string;
  material: string;
  quantity?: number;
  amountCents: number;
  colorName?: string | null;
  notes?: string | null;
  customerId: string;
  customerEmail?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payload: CheckoutPayload | null;
}

export default function CheckoutDialog({ open, onOpenChange, payload }: Props) {
  const { isDemo, loading } = useDemoMode();

  const fetchClientSecret = async (): Promise<string> => {
    if (!payload) throw new Error("No checkout payload");
    const returnUrl = `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { ...payload, returnUrl, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Failed to start checkout");
    }
    return data.clientSecret as string;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-2xl">
            {isDemo ? "Demo checkout" : "Pay your local maker"}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {open && payload && isDemo && !loading && (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">
                You'd be charging ${(payload.amountCents / 100).toFixed(2)} to a real maker
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We don't process real payments in demo mode. The instant we open in your zip,
                this button funds your neighbor's printer.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="hero" asChild>
                  <Link to="/waitlist">Get notified when we launch →</Link>
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Keep exploring
                </Button>
              </div>
            </div>
          )}
          {open && payload && !isDemo && !loading && (
            <div id="checkout">
              <EmbeddedCheckoutProvider
                key={`${payload.printerId}-${payload.amountCents}`}
                stripe={getStripe()}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
