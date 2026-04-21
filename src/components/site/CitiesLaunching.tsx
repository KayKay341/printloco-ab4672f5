import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";

// Cities we're rolling out to, sorted by waitlist demand.
const CITIES = [
  { name: "Brooklyn, NY", status: "Live in beta", pct: 100 },
  { name: "San Francisco, CA", status: "Onboarding makers", pct: 78 },
  { name: "Austin, TX", status: "Onboarding makers", pct: 64 },
  { name: "Los Angeles, CA", status: "Recruiting", pct: 52 },
  { name: "Chicago, IL", status: "Recruiting", pct: 41 },
  { name: "Boston, MA", status: "Recruiting", pct: 38 },
  { name: "Seattle, WA", status: "Waitlist", pct: 27 },
  { name: "Portland, OR", status: "Waitlist", pct: 22 },
  { name: "Atlanta, GA", status: "Waitlist", pct: 18 },
];

const CitiesLaunching = () => (
  <section className="bg-surface py-24">
    <div className="container">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            City rollout
          </div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Coming to a <span className="italic">block near you.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            We launch the cities with the most signups first. Add yours to push it up the queue.
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/waitlist">Add my city <ArrowRight /></Link>
        </Button>
      </div>

      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CITIES.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {c.status}
                </div>
                <div className="mt-1 font-display text-lg font-semibold">{c.name}</div>
              </div>
              <div className="font-display text-2xl font-semibold text-primary">
                {c.pct}%
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${c.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 + i * 0.04 }}
                className="h-full rounded-full bg-gradient-accent"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default CitiesLaunching;
