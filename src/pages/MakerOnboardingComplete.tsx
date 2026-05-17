import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";

const MakerOnboardingComplete = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper className="w-full max-w-lg">
        <OnboardingSteps currentStep={3} />
        <Card className="rounded-3xl border border-border shadow-card p-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-display text-4xl font-semibold tracking-tight">Onboarding Complete!</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Your printer is pending verification. Our team will review your photos soon. You can start setting up your shop in the meantime!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full mt-6">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default MakerOnboardingComplete;
