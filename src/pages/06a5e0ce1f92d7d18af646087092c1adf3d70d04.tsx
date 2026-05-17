import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, CreditCard, Loader2, Lock, Sparkles } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";

export type DemoCheckoutSummary = {
  printerLabel: string;
  makerName: string;
  material: string;
  colorName?: string | null;
  weightG: number;
  quantity: number;
  amountCents: number;
};

type Props = {
  summary: DemoCheckoutSummary;
  onSuccess: () => void;
  onCancel: () => void;
};

type Step = "summary" | "card" | "processing" | "done";

export default function DemoCheckout({ summary, onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<Step>("summary");
  const { toggleBypass } = useDemoMode();

  const startProcessing = () => {
    setStep("processing");
    window.setTimeout(() => {
      setStep("done");
      window.setTimeout(onSuccess, 800);
    }, 1600);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
        <Sparkles className="h-3.5 w-3.5" />
        Demo mode — no real charge
      </div>

      {step === "summary" && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order summary</div>
          <Row label="Printer" value={summary.printerLabel} />
          <Row label="Maker" value={summary.makerName} />
          <Row label="Material" value={summary.material} />
          {summary.colorName && <Row label="Color" value={summary.colorName} />}
          <Row label="Weight" value={`${summary.weightG.toFixed(1)} g`} />
          <Row label="Quantity" value={`${summary.quantity}`} />
          <div className="border-t border-border pt-3" />
          <Row label="Total" value={`$${(summary.amountCents / 100).toFixed(2)}`} bold />
          <div className="flex gap-2 pt-1">
            <Button variant="hero" className="flex-1" onClick={() => setStep("card")}>
              <CreditCard className="h-4 w-4" /> Continue
            </Button>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      )}

      {step === "card" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startProcessing();
          }}
          className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment details</div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Demo
            </span>
          </div>
          <div>
            <Label>Card number</Label>
            <Input value="4242 4242 4242 4242" readOnly className="font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Exp.</Label>
              <Input value="12 / 34" readOnly className="font-mono" />
            </div>
            <div>
              <Label>CVC</Label>
              <Input value="123" readOnly className="font-mono" />
            </div>
            <div>
              <Label>ZIP</Label>
              <Input value="90405" readOnly className="font-mono" />
            </div>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            This is a simulated checkout. No card is charged — but a real order will appear in your dashboard
            and progress through every status (paid → printing → ready) so you can experience the full flow.
          </div>
          <button
            type="button"
            onClick={toggleBypass}
            className="text-left text-[10px] text-accent underline underline-offset-2 hover:opacity-80"
          >
            Wait, I want to see the real Stripe UI (Test Mode) →
          </button>
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="hero" className="flex-1">
              Pay ${(summary.amountCents / 100).toFixed(2)}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep("summary")}>Back</Button>
          </div>
        </form>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 shadow-soft">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="font-display text-lg font-semibold">Processing demo payment…</div>
          <div className="text-xs text-muted-foreground">Authorizing • Reserving maker • Sending receipt</div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-10 text-center shadow-soft">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <div className="font-display text-xl font-semibold">Demo payment complete!</div>
          <div className="text-sm text-muted-foreground">Redirecting to your order…</div>
        </div>
      )}
    </div>
  );
}

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={bold ? "font-display text-lg font-semibold" : "font-medium"}>{value}</span>
  </div>
);
