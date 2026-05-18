import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OnboardingSteps, MAKER_STEPS } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";

const MakerOnboardingComplete = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper className="w-full max-w-lg">
        <OnboardingSteps currentStep={4} steps={MAKER_STEPS} />
        <Card className="rounded-3xl border border-border shadow-card p-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-display text-4xl font-semibold tracking-tight">Submitted!</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Your application is in review. Once approved, the last step is setting up your payout details so we can pay you for completed jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => navigate("/onboarding/financials")} className="w-full">
              Continue to payout setup
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default MakerOnboardingComplete;
