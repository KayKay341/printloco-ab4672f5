const items = [
  "PLA · ABS · TPU · PETG · Resin · Nylon · Carbon Fiber",
  "Same-day pickup",
  "10-mile radius",
  "Address-verified makers",
  "Browser-side slicing",
  "Pro bono for nonprofits",
];

const Marquee = () => (
  <div className="border-y border-border bg-surface-deep py-4 text-primary-foreground">
    <div className="flex overflow-hidden">
      <div className="marquee flex shrink-0 items-center gap-12 whitespace-nowrap pr-12 font-display text-lg italic">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-12">
            {t}
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default Marquee;
