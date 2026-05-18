export const MAKER_STEPS = ["Role", "Machine", "Verify", "Done"];

export const OnboardingSteps = ({ currentStep, steps = MAKER_STEPS }: { currentStep: number, steps?: string[] }) => {
  return (
    <div className="flex justify-between items-center mb-10 w-full max-w-lg mx-auto px-4">
      {steps.map((step, index) => {
        const isActive = index + 1 === currentStep;
        const isCompleted = index + 1 < currentStep;
        return (
          <div key={step} className="flex flex-col items-center gap-2">
            <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 text-sm font-bold transition-all ${
              isActive ? "border-primary bg-primary text-primary-foreground shadow-lg" : 
              isCompleted ? "border-primary bg-primary/20 text-primary" : "border-border bg-card text-muted-foreground"
            }`}>
              {isCompleted ? "✓" : index + 1}
            </div>
            <span className={`text-xs font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
          </div>
        );
      })}
    </div>
  );
};
