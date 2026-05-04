import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { LogOut, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { motion, AnimatePresence } from "framer-motion";

const baseLinks = [
  { label: "Gift Cards", to: "/gift-cards" },
  { label: "Waitlist", to: "/waitlist" },
  { label: "Invest", to: "/invest" },
];

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isDemo } = useDemoMode();
  const navigate = useNavigate();
  const [makeOpen, setMakeOpen] = useState(false);

  // Smart toggle: makers see "Find a Printer"; everyone else sees "Become a Maker".
  const primaryLink = profile?.role === "maker"
    ? { label: "Find a Printer", to: "/printers" }
    : { label: "Become a Maker", to: "/become-a-maker" };

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
        <nav className="hidden items-center gap-6 md:flex">
          {/* Make something dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setMakeOpen(true)}
            onMouseLeave={() => setMakeOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMakeOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-accent/80"
            >
              Make something
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${makeOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {makeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-card"
                >
                  {SERVICES.map((s) => {
                    const Icon = s.icon;
                    return (
                      <Link
                        key={s.id}
                        to={`/order/${s.id}`}
                        onClick={() => setMakeOpen(false)}
                        className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/60"
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{s.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{s.tagline}</div>
                        </div>
                      </Link>
                    );
                  })}
                  <Link
                    to="/services"
                    onClick={() => setMakeOpen(false)}
                    className="mt-1 flex items-center justify-center gap-1 rounded-xl border-t border-border p-2.5 text-xs font-semibold text-primary transition-colors hover:bg-muted/40"
                  >
                    Browse all services →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            to={primaryLink.to}
            className="text-sm font-semibold text-accent transition-colors hover:text-accent/80"
          >
            {primaryLink.label}
          </Link>
          {baseLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
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
