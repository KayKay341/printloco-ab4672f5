import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

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
          <DialogTitle className="font-display text-2xl">Pay your local maker</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {open && payload && (
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
