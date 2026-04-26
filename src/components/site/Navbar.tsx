import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { LogOut, ShieldCheck, Sparkles } from "lucide-react";

const baseLinks = [
  { label: "Upload STL", to: "/upload" },
  { label: "Gift Cards", to: "/gift-cards" },
  { label: "Waitlist", to: "/waitlist" },
  { label: "Invest", to: "/invest" },
];

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isDemo } = useDemoMode();
  const navigate = useNavigate();

  // Smart toggle: makers see "Find a Printer" (so they can scope the competition);
  // everyone else sees "Become a Maker" — the Etsy-style seller funnel.
  const primaryLink = profile?.role === "maker"
    ? { label: "Find a Printer", to: "/printers" }
    : { label: "Become a Maker", to: "/become-a-maker" };
  const links = [primaryLink, ...baseLinks];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" aria-label="PrintLoco home"><Logo /></Link>
          {isDemo && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent"
              title="You're in demo mode — orders & payments are simulated."
            >
              <Sparkles className="h-2.5 w-2.5" /> Demo
            </span>
          )}
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l, i) => {
            const isPrimary = i === 0;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={
                  isPrimary
                    ? "text-sm font-semibold text-accent transition-colors hover:text-accent/80"
                    : "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/admin"><ShieldCheck className="h-4 w-4" /> Admin</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/dashboard">{profile?.full_name || "Dashboard"}</Link>
              </Button>
              <Button variant="default" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/auth?mode=signin">Sign in</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/auth?mode=signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
