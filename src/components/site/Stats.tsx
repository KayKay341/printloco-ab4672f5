import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAppMetrics } from "@/hooks/useAppMetrics";

type LiveCounts = {
  waitlist: number | null;
  makers: number | null;
  cities: number | null;
};

const Stats = () => {
  const { metrics } = useAppMetrics();
  const [counts, setCounts] = useState<LiveCounts>({ waitlist: null, makers: null, cities: null });

  useEffect(() => {
    Promise.all([
      supabase.from("waitlist_signups").select("id", { count: "exact", head: true }),
      supabase.from("printers").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("cities").select("id", { count: "exact", head: true }),
    ]).then(([w, p, c]) => {
      setCounts({
        waitlist: w.count ?? 0,
        makers: p.count ?? 0,
        cities: c.count ?? 0,
      });
    });
  }, []);

  const stats = [
    {
      value: counts.waitlist == null ? "—" : counts.waitlist.toLocaleString(),
      label: "Neighbors on the waitlist today",
    },
    {
      value: counts.cities == null ? "—" : counts.cities.toLocaleString(),
      label: "Cities in the rollout queue",
    },
    {
      value: metrics.avg_cost_per_gram?.value_text ?? "—",
      label: "Average cost per gram of filament",
    },
    {
      value: metrics.savings_multiple?.value_text ?? "—",
      label: "Cheaper than legacy services like Shapeways or Xometry",
    },
  ];

  return (
    <section className="bg-surface-deep py-20 text-primary-foreground">
      <div className="container">
        <div className="mb-12 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Where we are today
          </div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Real numbers, updated live.
          </h2>
        </div>
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="border-l-2 border-accent pl-5"
            >
              <div className="font-display text-5xl font-semibold tracking-tight lg:text-6xl">
                {s.value}
              </div>
              <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-primary-foreground/70">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
