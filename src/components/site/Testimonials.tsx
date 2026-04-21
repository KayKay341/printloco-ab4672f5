import { Star } from "lucide-react";

const reviews = [
  {
    quote: "I needed a custom bracket for my bike repair shop. Found a maker 4 blocks away, picked it up the next morning. Saved me $80 vs ordering online.",
    name: "Diego R.",
    role: "Customer · Williamsburg",
  },
  {
    quote: "My Bambu printer was a $1,200 toy. Now it pays my electricity bill, my Spotify, and buys me dinner twice a week. Wish I'd done this years ago.",
    name: "Amelia K.",
    role: "Maker · Astoria",
  },
  {
    quote: "We printed 200 cable holders for our students' robotics kits. Zero cost, two days, picked up by the math teacher on her way home. Magic.",
    name: "PS 261",
    role: "Public school partner",
  },
];

const Testimonials = () => (
  <section className="container py-24">
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Real prints, real neighbors
      </div>
      <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
        18,000 prints. <span className="italic">Zero shipping labels.</span>
      </h2>
    </div>

    <div className="mt-14 grid gap-6 md:grid-cols-3">
      {reviews.map((r, i) => (
        <figure
          key={i}
          className="flex flex-col rounded-3xl border border-border bg-card p-7 shadow-soft transition-all hover:shadow-card"
        >
          <div className="flex gap-0.5 text-accent">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star key={j} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <blockquote className="mt-5 flex-1 font-display text-lg leading-snug">
            “{r.quote}”
          </blockquote>
          <figcaption className="mt-6 border-t border-border pt-4">
            <div className="font-semibold">{r.name}</div>
            <div className="text-sm text-muted-foreground">{r.role}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
);

export default Testimonials;
