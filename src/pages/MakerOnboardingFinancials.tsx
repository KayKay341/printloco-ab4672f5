import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { OnboardingSteps, MAKER_STEPS } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";

const MakerOnboardingFinancials = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState(user?.email ?? "");
  const [taxId, setTaxId] = useState("");
  const [bankLast4, setBankLast4] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Stripe Connect / payout setup would happen here.
      toast.success("Payout info saved. You're ready to take orders!");
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
              You're approved! Add your financial details so we can pay you for completed jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Payout email</Label>
                <Input type="email" value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tax ID / SSN (last 4)</Label>
                <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} maxLength={9} required />
              </div>
              <div className="space-y-2">
                <Label>Bank account (last 4)</Label>
                <Input value={bankLast4} onChange={(e) => setBankLast4(e.target.value)} maxLength={4} required />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? "Saving…" : "Finish setup"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Secure payouts powered by our payments partner. You can update this anytime.
              </p>
            </form>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default MakerOnboardingFinancials;
