import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

// Pre-launch — no fake reviews. Use a vision/manifesto block instead.
const beliefs = [
  {
    title: "Local-first by default",
    body: "If a maker two blocks away has the printer you need, you should never have to wait two weeks for a box from across the country.",
  },
  {
    title: "Inventory is human-scale",
    body: "Every printer, every color of filament, every Friday-afternoon free slot — visible, verified, and updated in real time.",
  },
  {
    title: "Profits go back to the block",
    body: "10% of every transaction funds free prints for the public schools, libraries, and nonprofits in the same zip code.",
  },
];

const Testimonials = () => (
  <section className="container py-24">
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Our manifesto
      </div>
      <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
        Manufacturing should feel like <span className="italic">your neighborhood.</span>
      </h2>
    </div>

    <div className="mt-14 grid gap-6 md:grid-cols-3">
      {beliefs.map((b, i) => (
        <motion.figure
          key={b.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="flex flex-col rounded-3xl border border-border bg-card p-7 shadow-soft transition-all hover:shadow-card"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-5 font-display text-xl font-semibold">{b.title}</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
        </motion.figure>
      ))}
    </div>
  </section>
);

export default Testimonials;
