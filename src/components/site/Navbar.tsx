import { Button } from "@/components/ui/button";
import Logo from "./Logo";

const links = [
  { label: "Find a Printer", href: "#discover" },
  { label: "How it works", href: "#how" },
  { label: "Become a Maker", href: "#makers" },
  { label: "Community", href: "#community" },
];

const Navbar = () => (
  <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
    <div className="container flex h-16 items-center justify-between">
      <Logo />
      <nav className="hidden items-center gap-8 md:flex">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {l.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
          Sign in
        </Button>
        <Button variant="default" size="sm">
          Get started
        </Button>
      </div>
    </div>
  </header>
);

export default Navbar;
