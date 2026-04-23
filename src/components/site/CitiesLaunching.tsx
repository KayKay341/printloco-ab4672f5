import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppMetrics } from "@/hooks/useAppMetrics";

type City = {
  id: string;
  name: string;
  status: "waitlist" | "launching" | "live";
  signup_count: number;
  launch_date: string | null;
};

const STATUS_LABEL: Record<City["status"], string> = {
  waitlist: "Waitlist",
  launching: "Launching soon",
  live: "Live now",
};

const CitiesLaunching = () => {
  const [cities, setCities] = useState<City[]>([]);
  const { metrics } = useAppMetrics();

  useEffect(() => {
    supabase
      .from("cities")
      .select("id,name,status,signup_count,launch_date")
      .order("signup_count", { ascending: false })
      .then(({ data }) => setCities((data as City[]) ?? []));
  }, []);

  const target = Number(metrics.waitlist_target?.value_number ?? 1000) || 1000;
  const top = useMemo(() => Math.max(...cities.map((c) => c.signup_count), 1), [cities]);

  if (cities.length === 0) {
    return (
      <section className="bg-surface py-24">
        <div className="container text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">City rollout</div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Be the first city in the queue.
          </h2>
          <p className="mt-4 text-muted-foreground">
            We launch a city the moment its waitlist hits {target.toLocaleString()} signups.
          </p>
          <Button variant="hero" asChild className="mt-8">
            <Link to="/waitlist">Add my city <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface py-24">
      <div className="container">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">City rollout</div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Coming to a <span className="italic">block near you.</span>
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Cities sorted by current waitlist size — every signup pushes a city up the queue.
            </p>
          </div>
          <Button variant="hero" asChild>
            <Link to="/waitlist">Add my city <ArrowRight /></Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((c, i) => {
            const pct = Math.max(6, Math.round((c.signup_count / top) * 100));
            return (
              <motion.div
                key={c.id}
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
                      {STATUS_LABEL[c.status]}
                    </div>
                    <div className="mt-1 font-display text-lg font-semibold">{c.name}</div>
                  </div>
                  <div className="font-display text-2xl font-semibold text-primary">
                    {c.signup_count.toLocaleString()}
                  </div>
                </div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 + i * 0.04 }}
                    className="h-full rounded-full bg-gradient-accent"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CitiesLaunching;
