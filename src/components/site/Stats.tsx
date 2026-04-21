import { motion } from "framer-motion";

// Pre-launch metrics, no fabricated user counts or ratings.
const stats = [
  { value: "<10mi", label: "Target distance to your nearest maker once we launch your zip" },
  { value: "<4hr", label: "Median goal: file uploaded → finished print in your hand" },
  { value: "10×", label: "Cheaper than legacy services like Shapeways or Xometry" },
  { value: "$0", label: "Forever free for verified nonprofits and public schools" },
];

const Stats = () => (
  <section className="bg-surface-deep py-20 text-primary-foreground">
    <div className="container">
      <div className="mb-12 max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          What we're building
        </div>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          The numbers we're committing to.
        </h2>
      </div>
      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.value}
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

export default Stats;
