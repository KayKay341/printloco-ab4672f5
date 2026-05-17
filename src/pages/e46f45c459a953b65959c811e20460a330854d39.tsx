import { useDemoMode } from "@/hooks/useDemoMode";
import { Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const DemoModeBanner = () => {
  const { isDemo, loading, bannerDismissed, toggleBypass, setBannerDismissed } = useDemoMode();
  if (loading || !isDemo || bannerDismissed) return null;
  return (
    <div className="border-b border-accent/30 bg-accent/10">
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2 py-0.5 font-semibold text-accent">
          <Sparkles className="h-3 w-3" /> LIVE DEMO
        </span>
        <span className="font-medium">
          Every button works.
        </span>
        <span className="text-muted-foreground">
          Payments are simulated — your data stays in your browser.
        </span>
        <button
          onClick={toggleBypass}
          className="font-bold text-accent hover:opacity-80 transition-opacity underline underline-offset-4"
        >
          Switch to Real Stripe UI (Test Mode)
        </button>
        <Link
          to="/waitlist"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          Join the waitlist →
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="ml-1 h-6 w-6"
          onClick={() => setBannerDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default DemoModeBanner;
