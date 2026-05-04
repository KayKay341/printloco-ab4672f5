import { Button } from "@/components/ui/button";
import { MapPin, Search, Upload, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import heroImg from "@/assets/hero-printer.jpg";

const ROTATING = [
  { word: "3D printed.", color: "text-primary" },
  { word: "laser cut.", color: "text-accent" },
  { word: "embroidered.", color: "text-primary" },
  { word: "CNC machined.", color: "text-accent" },
  { word: "vinyl cut.", color: "text-primary" },
];

const Hero = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % ROTATING.length), 2400);
    return () => clearInterval(t);
  }, []);
  const current = ROTATING[idx];
  return (
  <section className="relative overflow-hidden bg-gradient-hero">
    <div className="grain absolute inset-0 opacity-60" aria-hidden />
    <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl" aria-hidden />
    <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />

    <div className="container relative grid gap-12 py-20 lg:grid-cols-12 lg:gap-8 lg:py-28">
      {/* Left */}
      <div className="lg:col-span-7 lg:pr-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Now in private beta · Join the waitlist
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl"
        >
          Every neighborhood
          <br />
          has a <span className="italic text-primary">3D printer.</span>
          <br />
          <span className="text-accent">We help you find it.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-6 max-w-xl text-lg text-muted-foreground text-balance"
        >
          PrintLoco is the hyperlocal marketplace for 3D printing. Upload your STL, get a real
          quote in seconds, and pick up your part from a maker around the corner — not a warehouse
          across the country.
        </motion.p>

        {/* Search card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="mt-8 rounded-3xl border border-border/80 bg-card p-2 shadow-card"
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-muted/50">
              <MapPin className="h-4 w-4 text-primary" />
              <div className="text-left flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Where
                </div>
                <input
                  placeholder="Your zip code"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-muted/50 sm:border-l sm:border-border">
              <Search className="h-4 w-4 text-primary" />
              <div className="text-left flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  What
                </div>
                <input
                  placeholder="What do you want to print?"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </label>
            <Button variant="hero" size="lg" className="rounded-2xl" asChild>
              <Link to="/upload"><Upload className="h-4 w-4" /> Try the demo</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center gap-3"
        >
          <Button variant="hero" size="lg" asChild>
            <Link to="/waitlist">Join the waitlist <ArrowRight /></Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/invest">Invest in us</Link>
          </Button>
        </motion.div>
      </div>

      {/* Right: Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.2 }}
        className="relative lg:col-span-5"
      >
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-accent opacity-25 blur-3xl" />
          <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-card">
            <img
              src={heroImg}
              alt="A 3D printer creating an orange geometric vase in a warmly lit workshop"
              width={1600}
              height={1200}
              className="h-full w-full object-cover"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="absolute -left-4 top-10 rounded-2xl border border-border bg-card p-4 shadow-card animate-float sm:-left-10"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live quote
            </div>
            <div className="mt-1 font-display text-2xl font-semibold">$9.40</div>
            <div className="text-xs text-muted-foreground">47g · PLA · ready today</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="absolute -bottom-6 -right-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-5 shadow-card sm:-right-8"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">A maker near you</div>
              <div className="text-sm font-semibold">Match in &lt; 2 sec</div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default Hero;
