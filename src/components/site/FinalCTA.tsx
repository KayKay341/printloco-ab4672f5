import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const FinalCTA = () => (
  <section className="container pb-24">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7 }}
      className="relative overflow-hidden rounded-[2.5rem] bg-gradient-accent p-10 text-accent-foreground shadow-glow sm:p-16"
    >
      <div
        className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-foreground/10 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <h2 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl text-balance">
            Print local.
            <br />
            <span className="italic opacity-80">Print today.</span>
          </h2>
          <p className="mt-5 max-w-md text-base text-accent-foreground/80">
            Reserve your zip on the waitlist, or back the round to help us launch faster. Either
            way, your community is closer than you think.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Button size="xl" asChild className="bg-surface-deep text-primary-foreground hover:bg-foreground">
            <Link to="/waitlist">Join the waitlist <ArrowRight /></Link>
          </Button>
          <Button size="xl" variant="outline" asChild className="border-foreground/30 text-foreground hover:bg-foreground/10">
            <Link to="/invest">Back the round</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  </section>
);

export default FinalCTA;
