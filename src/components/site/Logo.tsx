const Logo = ({ className = "" }: { className?: string }) => (
  <a href="#" className={`inline-flex items-center gap-2 ${className}`}>
    <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-deep text-primary-foreground shadow-soft">
      <span className="absolute inset-1 rounded-lg border border-accent/40" />
      <span className="font-display text-base font-bold tracking-tight">P</span>
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
    </span>
    <span className="font-display text-xl font-semibold tracking-tight">
      Print<span className="text-accent">Loco</span>
    </span>
  </a>
);

export default Logo;
