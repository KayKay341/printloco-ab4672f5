import { useDemoMode } from "@/hooks/useDemoMode";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export const DemoModeBanner = () => {
  const { isDemo, loading } = useDemoMode();
  if (loading || !isDemo) return null;
  return (
    <div className="border-b border-accent/30 bg-accent/10">
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-xs">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="font-medium">
          You're exploring the live demo.
        </span>
        <span className="text-muted-foreground">
          Real bookings, payouts, and city launches start when we open in your zip.
        </span>
        <Link
          to="/waitlist"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          Join the waitlist →
        </Link>
      </div>
    </div>
  );
};
