import { Upload, MapPin, Package } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: Upload,
    title: "Upload your STL",
    body: "Drag and drop any 3D file up to 500MB. We instantly calculate weight, print time, and material cost.",
  },
  {
    n: "02",
    icon: MapPin,
    title: "Pick a local maker",
    body: "Browse verified printers within 10 miles. Compare ratings, materials, build volume, and turnaround time.",
  },
  {
    n: "03",
    icon: Package,
    title: "Pickup or delivery",
    body: "Same-day rush, next-day standard, or weekend pickup. Track your print live and message your maker.",
  },
];

const HowItWorks = () => (
  <section id="how" className="container py-24">
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          How it works
        </div>
        <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          From file to <span className="italic">finished part</span> in a single afternoon.
        </h2>
        <p className="mt-5 text-muted-foreground">
          No shipping. No middlemen. No two-week waits. Just a maker around the corner with the right printer for the job.
        </p>
      </div>

      <div className="lg:col-span-8">
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map(({ n, icon: Icon, title, body }) => (
            <li
              key={n}
              className="group relative flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-display text-sm font-medium text-muted-foreground">
                  {n}
                </span>
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);

export default HowItWorks;
