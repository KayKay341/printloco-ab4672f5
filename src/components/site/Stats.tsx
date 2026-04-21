const stats = [
  { value: "10mi", label: "Average distance to your nearest maker" },
  { value: "4hr", label: "Median turnaround time, file to finished print" },
  { value: "47%", label: "Cheaper than commercial 3D printing services" },
  { value: "$0", label: "Cost for verified nonprofits and public schools" },
];

const Stats = () => (
  <section className="bg-surface-deep py-20 text-primary-foreground">
    <div className="container">
      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.value} className="border-l-2 border-accent pl-5">
            <div className="font-display text-5xl font-semibold tracking-tight lg:text-6xl">
              {s.value}
            </div>
            <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-primary-foreground/70">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Stats;
