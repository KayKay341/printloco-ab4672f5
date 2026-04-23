import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useNavigate } from "react-router-dom";
import DemoCheckout from "@/components/DemoCheckout";

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
  // Demo-only enrichment so the simulated order looks real:
  printerLabel?: string;
  makerName?: string;
  fileName?: string | null;
  fileKind?: "stl" | "3mf" | "url" | null;
  fileUrl?: string | null;
  weightG?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payload: CheckoutPayload | null;
}

export default function CheckoutDialog({ open, onOpenChange, payload }: Props) {
  const { isDemo, loading, createDemoOrder } = useDemoMode();
  const navigate = useNavigate();

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

  const handleDemoSuccess = () => {
    if (!payload) return;
    const order = createDemoOrder({
      printerId: payload.printerId,
      printerLabel: payload.printerLabel ?? "Demo printer",
      makerName: payload.makerName ?? "Demo maker",
      fileName: payload.fileName ?? null,
      fileKind: payload.fileKind ?? null,
      fileUrl: payload.fileUrl ?? null,
      material: payload.material,
      colorName: payload.colorName ?? null,
      quantity: payload.quantity ?? 1,
      weightG: payload.weightG ?? 0,
      amountCents: payload.amountCents,
    });
    onOpenChange(false);
    navigate(`/checkout/return?demo=1&order=${encodeURIComponent(order.id)}`);
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
            <DemoCheckout
              summary={{
                printerLabel: payload.printerLabel ?? "Demo printer",
                makerName: payload.makerName ?? "Demo maker",
                material: payload.material,
                colorName: payload.colorName ?? null,
                weightG: payload.weightG ?? 0,
                quantity: payload.quantity ?? 1,
                amountCents: payload.amountCents,
              }}
              onSuccess={handleDemoSuccess}
              onCancel={() => onOpenChange(false)}
            />
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
