const steps = ["Profile", "Machine", "Completion"];

export const OnboardingSteps = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="flex justify-center gap-4 mb-8">
      {steps.map((step, index) => (
        <div key={step} className={`flex items-center gap-2 ${index + 1 <= currentStep ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`flex items-center justify-center h-8 w-8 rounded-full border-2 ${index + 1 <= currentStep ? "border-primary bg-primary/10" : "border-muted"}`}>
            {index + 1}
          </div>
          <span className="font-semibold text-sm">{step}</span>
        </div>
      ))}
    </div>
  );
};
