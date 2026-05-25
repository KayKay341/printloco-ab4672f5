import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import { OnboardingSteps, MAKER_STEPS } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";

type EntityType = "individual" | "sole_prop" | "llc" | "corp";

const MakerOnboardingFinancials = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("individual");
  const [payoutEmail, setPayoutEmail] = useState(user?.email ?? "");
  const [taxId, setTaxId] = useState("");
  const [bankLast4, setBankLast4] = useState("");
  const [country, setCountry] = useState("US");

  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [confirm1099, setConfirm1099] = useState(false);
  const [confirmTos, setConfirmTos] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmAccurate || !confirm1099 || !confirmTos) {
      toast.error("Please confirm all three checkboxes before continuing.");
      return;
    }
    setLoading(true);
    try {
      // Persist a local record so the maker has proof of what they submitted.
      // The actual KYC + bank verification happens with our payments partner
      // (Stripe Connect) on the next step — we don't store full SSN/bank here.
      try {
        const record = {
          user_id: user?.id,
          legal_name: legalName,
          entity_type: entityType,
          payout_email: payoutEmail,
          tax_id_last4: taxId.slice(-4),
          bank_last4: bankLast4,
          country,
          confirmed_accurate: confirmAccurate,
          confirmed_1099: confirm1099,
          confirmed_tos: confirmTos,
          captured_at: new Date().toISOString(),
        };
        localStorage.setItem(`payout-intent:${user?.id ?? "anon"}`, JSON.stringify(record));
      } catch {}

      toast.success("Saved. Next: secure ID & bank verification with our payments partner.");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to save financial info.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper className="w-full max-w-lg">
        <OnboardingSteps currentStep={5} steps={MAKER_STEPS} />
        <Card className="rounded-3xl border border-border shadow-card p-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-display text-4xl font-semibold tracking-tight">Set up payouts</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              You're approved! A few legal basics so we can pay you and file the right tax forms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert className="rounded-2xl">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Your info is protected</AlertTitle>
              <AlertDescription className="text-xs">
                Bank and full Tax ID details are verified through our payments partner (Stripe Connect)
                in the next step — PrintLoco never stores your full SSN or bank account number.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Legal name (as on tax documents)</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Business type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as EntityType)}
                >
                  <option value="individual">Individual (hobbyist / freelancer)</option>
                  <option value="sole_prop">Sole proprietor</option>
                  <option value="llc">LLC</option>
                  <option value="corp">Corporation / S-Corp</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Country of tax residence</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Payout email</Label>
                <Input type="email" value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Tax ID — SSN or EIN (last 4 only)</Label>
                <Input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  placeholder="1234"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Full SSN/EIN is collected securely by Stripe in the next step for 1099 reporting.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Bank account (last 4)</Label>
                <Input
                  value={bankLast4}
                  onChange={(e) => setBankLast4(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  placeholder="5678"
                  required
                />
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3 mt-2">
                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <Checkbox checked={confirmAccurate} onCheckedChange={(v) => setConfirmAccurate(v === true)} className="mt-0.5" />
                  <span className="text-muted-foreground">
                    Everything I entered is accurate and belongs to me (or my business).
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <Checkbox checked={confirm1099} onCheckedChange={(v) => setConfirm1099(v === true)} className="mt-0.5" />
                  <span className="text-muted-foreground">
                    I understand PrintLoco will issue a 1099 (or local equivalent) if I earn over the
                    yearly reporting threshold, and I'm responsible for my own taxes.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <Checkbox checked={confirmTos} onCheckedChange={(v) => setConfirmTos(v === true)} className="mt-0.5" />
                  <span className="text-muted-foreground">
                    I agree to PrintLoco's payout terms and our payments partner's connected-account
                    agreement on the next screen.
                  </span>
                </label>
              </div>

              <Alert className="rounded-2xl">
                <Info className="h-4 w-4" />
                <AlertTitle>Next steps</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <p>1. Verify your identity with our payments partner (photo ID + selfie).</p>
                  <p>2. Connect your bank account for direct deposits.</p>
                  <p>3. We hold funds in escrow until each order is marked complete — then payout in 2–5 business days.</p>
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                <FileText className="h-4 w-4 mr-2" />
                {loading ? "Saving…" : "Save & continue to ID verification"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Secure payouts powered by Stripe Connect. You can update this anytime.
              </p>
            </form>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default MakerOnboardingFinancials;
