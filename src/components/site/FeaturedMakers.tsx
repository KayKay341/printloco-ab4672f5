import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import sarah from "@/assets/maker-sarah.jpg";
import marcus from "@/assets/maker-marcus.jpg";
import prints from "@/assets/prints-grid.jpg";

const makers = [
  {
    name: "Sarah Chen",
    hood: "Prospect Heights, Brooklyn",
    img: sarah,
    rating: 4.9,
    prints: 247,
    printers: "Bambu X1C · Prusa MK4",
    materials: ["PLA", "PETG", "TPU"],
    price: "from $0.18/g",
    distance: "0.6 mi",
  },
  {
    name: "Marcus Thompson",
    hood: "Greenpoint, Brooklyn",
    img: marcus,
    rating: 5.0,
    prints: 412,
    printers: "Formlabs Form 3 · Resin specialist",
    materials: ["Resin", "Tough", "Castable"],
    price: "from $0.45/g",
    distance: "1.4 mi",
  },
  {
    name: "Maya & The Maker Lab",
    hood: "Bushwick, Brooklyn",
    img: prints,
    rating: 4.8,
    prints: 1240,
    printers: "Fleet of 8 · Industrial",
    materials: ["Nylon", "Carbon", "ABS"],
    price: "from $0.22/g",
    distance: "2.1 mi",
  },
];

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
    {children}
  </span>
);

const FeaturedMakers = () => (
  <section id="discover" className="bg-surface py-24">
    <div className="container">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Near you · Brooklyn
          </div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Makers in your <span className="italic">neighborhood</span>
          </h2>
        </div>
        <Button variant="soft">View all 142 makers →</Button>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {makers.map((m) => (
          <article
            key={m.name}
            className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-card"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={m.img}
                alt={`${m.name}'s 3D printing workshop`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-card/95 px-3 py-1 text-xs font-semibold shadow-soft backdrop-blur">
                <MapPin className="h-3 w-3 text-accent" /> {m.distance}
              </div>
              <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-surface-deep/85 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur">
                <Star className="h-3 w-3 fill-accent text-accent" />
                {m.rating} <span className="opacity-60">· {m.prints}</span>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-display text-xl font-semibold">{m.name}</h3>
              <p className="text-sm text-muted-foreground">{m.hood}</p>
              <p className="mt-4 text-sm font-medium">{m.printers}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.materials.map((mat) => (
                  <Chip key={mat}>{mat}</Chip>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Pricing
                  </div>
                  <div className="font-display text-lg font-semibold">{m.price}</div>
                </div>
                <Button size="sm">Request quote</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturedMakers;
