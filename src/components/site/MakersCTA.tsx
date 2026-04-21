import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import prints from "@/assets/prints-grid.jpg";

const perks = [
  "Set your own per-gram pricing — keep 90% of every job",
  "Block your calendar — accept jobs only when you're free",
  "Same-week payouts via Stripe, no minimums",
  "Verified badge on your profile after your first 5 prints",
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="order-1 p-10 lg:order-2 lg:p-16"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          For Printer Owners
        </div>
        <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Your printer can pay for itself in <span className="italic text-accent">six weeks.</span>
        </h2>
        <p className="mt-5 max-w-md text-primary-foreground/75">
          That printer in your spare bedroom is sitting idle 22 hours a day. Turn excess capacity
          into real side income — on your schedule, in your neighborhood.
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
          <Button variant="hero" size="lg" asChild>
            <Link to="/waitlist">Join the maker waitlist</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50"
          >
            <Link to="/auth?mode=signup&role=maker">Already in beta? Sign in</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default MakersCTA;
