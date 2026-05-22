import Logo from "./Logo";
import { Link } from "react-router-dom";

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Print",
    links: [
      { label: "Find a maker", href: "/printers" },
      { label: "Upload STL", href: "/upload" },
      { label: "Join the waitlist", href: "/waitlist" },
    ],
  },
  {
    title: "Make",
    links: [
      { label: "Become a maker", href: "/auth?mode=signup&role=maker" },
      { label: "List a printer", href: "/printers/new" },
      { label: "Maker waitlist", href: "/waitlist" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Nonprofit program", href: "/waitlist" },
      { label: "School partnerships", href: "/waitlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Invest in PrintLoco", href: "/invest" },
      { label: "Contact", href: "mailto:hello@printloco.app" },
    ],
  },
];

const Footer = () => (
  <footer className="border-t border-border bg-surface">
    <div className="container py-16">
      <div className="grid gap-12 lg:grid-cols-[1.5fr_3fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Hyperlocal manufacturing for every neighborhood. Built with care in Brooklyn.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {cols.map((c) => (
            <div key={c.title}>
              <div className="font-display text-sm font-semibold">{c.title}</div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={`${c.title}-${l.label}-${l.href}`}>
                    {l.href.startsWith("/") ? (
                      <Link to={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <div>© {new Date().getFullYear()} PrintLoco · A community maker platform</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Trust & safety</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
