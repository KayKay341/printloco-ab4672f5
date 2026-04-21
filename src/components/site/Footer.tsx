import Logo from "./Logo";

const cols = [
  {
    title: "Print",
    links: ["Find a maker", "Upload STL", "Pricing calculator", "Materials guide"],
  },
  {
    title: "Make",
    links: ["Become a maker", "Earnings calculator", "Maker handbook", "Pro tools"],
  },
  {
    title: "Community",
    links: ["Nonprofit program", "School partnerships", "Maker spotlight", "Print challenges"],
  },
  {
    title: "Company",
    links: ["About", "Press", "Careers", "Contact"],
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
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <div>© {new Date().getFullYear()} PrintLocal · A community maker platform</div>
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
