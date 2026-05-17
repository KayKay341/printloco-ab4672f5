import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { LogOut, ShieldCheck, Sparkles, ChevronDown, User, LayoutDashboard, Settings } from "lucide-react";
import { SERVICES } from "@/lib/services";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-accent/80">
              Make something
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 rounded-2xl p-2 shadow-card border border-border">
              {SERVICES.map((s) => {
                const Icon = s.icon;
                return (
                  <DropdownMenuItem key={s.id} asChild>
                    <Link to={`/order/${s.id}`} className="flex items-start gap-3 rounded-xl p-2.5">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{s.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.tagline}</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/services" className="flex items-center justify-center p-2.5 text-xs font-semibold text-primary">
                  Browse all services →
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  {profile?.full_name || "Account"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-card border border-border">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" /> Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
