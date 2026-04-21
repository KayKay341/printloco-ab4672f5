import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import prints from "@/assets/prints-grid.jpg";

const perks = [
  "Set your own pricing per gram or per hour",
  "Block your calendar — accept jobs only when free",
  "Stripe payouts every Friday, no minimum",
  "Verified badge after your first 5 five-star prints",
];

const MakersCTA = () => (
  <section id="makers" className="container py-24">
    <div className="grid overflow-hidden rounded-[2.5rem] bg-gradient-deep text-primary-foreground shadow-card lg:grid-cols-2">
      <div className="relative order-2 hidden lg:order-1 lg:block">
        <img
          src={prints}
          alt="A grid of colorful 3D printed objects: vases, gears and miniatures"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-deep/30" />
      </div>

      <div className="order-1 p-10 lg:order-2 lg:p-16">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          For Printer Owners
        </div>
        <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Your printer pays for itself in <span className="italic text-accent">six weeks.</span>
        </h2>
        <p className="mt-5 max-w-md text-primary-foreground/75">
          That printer in your spare bedroom is sitting idle 22 hours a day. Turn excess capacity into $400–$1,200 in monthly side income — on your schedule.
        </p>

        <ul className="mt-8 space-y-3">
          {perks.map((p) => (
            <li key={p} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-primary-foreground/90">{p}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button variant="hero" size="lg">Become a Maker</Button>
          <Button variant="outline" size="lg" className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50">
            Earnings calculator
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default MakersCTA;
