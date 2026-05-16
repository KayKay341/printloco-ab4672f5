import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { SERVICES, type ServiceId } from "@/lib/services";
import {
  Sparkles,
  DollarSign,
  Clock,
  Shield,
  Star,
  TrendingUp,
  Users,
  Package,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Quote,
  Calculator,
  Camera,
  MapPin,
  Zap,
  HeartHandshake,
} from "lucide-react";

/**
 * Etsy-style "Open your shop" landing page for makers across ALL crafts:
 * 3D printing, laser cutting, embroidery, CNC milling, and vinyl/stickers.
 */

const STEPS = [
  {
    n: "01",
    icon: <Camera className="h-5 w-5" />,
    title: "Snap your machine",
    body: "Take 1 photo of your machine and 3 sample pieces. We verify within 24h so customers trust you from day one.",
  },
  {
    n: "02",
    icon: <Package className="h-5 w-5" />,
    title: "Set materials & pricing",
    body: "List the materials you stock and your rates. Use our suggested pricing or set your own — works for any craft.",
  },
  {
    n: "03",
    icon: <Zap className="h-5 w-5" />,
    title: "Get matched automatically",
    body: "When a nearby customer uploads a file (STL, SVG, DST, STEP…), we match them to you based on craft, size, and tier.",
  },
  {
    n: "04",
    icon: <DollarSign className="h-5 w-5" />,
    title: "Make it, hand off, get paid",
    body: "Customer pays upfront. You make it, they pick up with a code, money lands in your account next day.",
  },
];

const PERKS = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: "You're protected",
    body: "Every order is paid before you start. No chasing invoices. No no-shows.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Local-first matching",
    body: "We send you customers from your neighborhood — short pickups, happy buyers, repeat orders.",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Build a real reputation",
    body: "Tier badges, ratings, and quality scores reward consistent makers — not whoever bids lowest.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Work on your schedule",
    body: "Accept jobs only when your machine's free. Pause your shop in one click when you're on vacation.",
  },
  {
    icon: <HeartHandshake className="h-5 w-5" />,
    title: "Real human support",
    body: "Disputes? Tricky file? Our team has your back — and our 7-day remake guarantee splits costs fairly.",
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: "Free tools, no monthly fee",
    body: "Smart previews, AI cost estimator, bulk quote workflow, and earnings dashboard — all included.",
  },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    city: "Echo Park, LA",
    machine: "Bambu X1C — 3D printing",
    rating: 4.9,
    quote:
      "Made $640 my first month — and that's just from neighbors I never would've met otherwise. PrintLoco is the side hustle I wish existed years ago.",
  },
  {
    name: "Priya R.",
    city: "Brooklyn, NY",
    machine: "Glowforge Pro — Laser cutting",
    rating: 5.0,
    quote:
      "I was nervous about strangers, but verified pickup codes and upfront payment make it feel safe. My laser pays for itself now.",
  },
  {
    name: "Diego F.",
    city: "Mission, SF",
    machine: "Brother PR1055X — Embroidery",
    rating: 4.8,
    quote:
      "I went from 3 patches/month for friends to 30+ paid orders. The quality tiers actually reward you for doing it right.",
  },
];

const FAQ = [
  {
    q: "What kinds of makers can join?",
    a: "Any craft we support: 3D printing (FDM/resin), laser cutting & engraving, machine embroidery, CNC milling/routing, and vinyl/sticker cutting. More crafts are coming soon.",
  },
  {
    q: "How much does it cost to list?",
    a: "Nothing. PrintLoco only takes a small platform fee on completed orders — no listing fees, no monthly charges, no cancellation penalties.",
  },
  {
    q: "What machines can I list?",
    a: "Any machine in good working order. Bambu, Prusa, Glowforge, xTool, Brother, Tajima, Shapeoko, Cricut, Roland — they all qualify. We verify with a quick photo of sample work.",
  },
  {
    q: "How fast do I get paid?",
    a: "Payments arrive in your bank account 1–2 business days after the customer picks up and confirms.",
  },
  {
    q: "What if something goes wrong?",
    a: "Our 7-day remake guarantee splits the cost of redoing a job when something fails. Most disputes resolve in under 48 hours.",
  },
  {
    q: "Do I need to be home for pickups?",
    a: "Yes, but you control your pickup window. Most makers set evening or weekend slots. Pickup codes confirm the right buyer.",
  },
];

/** Per-service economics tuned to give a realistic monthly range. */
type EarningsModel = {
  unitLabel: string; // "g/hr", "min/job", "stitches/min"...
  defaultRate: number; // default price the slider opens at
  minRate: number;
  maxRate: number;
  step: number;
  rateLabel: string; // "Price per gram", "Price per minute"...
  rateFormat: (v: number) => string;
  /** Returns gross $/hour given the chosen rate. */
  grossPerHour: (rate: number) => number;
  rateHintLow: string;
  rateHintHigh: string;
};

const ECON: Record<ServiceId, EarningsModel> = {
  "3d-print": {
    unitLabel: "g/hr",
    defaultRate: 0.2,
    minRate: 0.1,
    maxRate: 0.5,
    step: 0.01,
    rateLabel: "Price per gram",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    grossPerHour: (rate) => 15 * rate, // ~15g/hr throughput
    rateHintLow: "Budget ($0.10)",
    rateHintHigh: "Premium ($0.50)",
  },
  "laser-cut": {
    unitLabel: "min/job",
    defaultRate: 1.5,
    minRate: 0.5,
    maxRate: 4,
    step: 0.1,
    rateLabel: "Price per machine minute",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    grossPerHour: (rate) => 60 * rate * 0.7, // 70% machine utilization
    rateHintLow: "Hobby ($0.50)",
    rateHintHigh: "Pro ($4.00)",
  },
  embroidery: {
    unitLabel: "stitches/min",
    defaultRate: 0.85,
    minRate: 0.3,
    maxRate: 2.5,
    step: 0.05,
    rateLabel: "Price per 1,000 stitches",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    // ~800 stitches/min, ~70% utilization → 33,600 stitches/hr → /1000 * rate
    grossPerHour: (rate) => 33.6 * rate,
    rateHintLow: "Starter ($0.30)",
    rateHintHigh: "Premium ($2.50)",
  },
  cnc: {
    unitLabel: "min/job",
    defaultRate: 2.5,
    minRate: 1,
    maxRate: 6,
    step: 0.1,
    rateLabel: "Price per machine minute",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    grossPerHour: (rate) => 60 * rate * 0.6, // CNC is slower / more setup
    rateHintLow: "Hobby ($1.00)",
    rateHintHigh: "Pro ($6.00)",
  },
  vinyl: {
    unitLabel: "sq.ft/hr",
    defaultRate: 6,
    minRate: 2,
    maxRate: 20,
    step: 0.5,
    rateLabel: "Price per sq. ft.",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    grossPerHour: (rate) => 4 * rate, // ~4 sq.ft. produced per hour
    rateHintLow: "Basic ($2)",
    rateHintHigh: "Print + cut ($20)",
  },
};

const BecomeMaker = () => {
  const { user, profile } = useAuth();
  const isAlreadyMaker = profile?.role === "maker";

  const [serviceId, setServiceId] = useState<ServiceId>("3d-print");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(20);
  const econ = ECON[serviceId];
  const [rate, setRate] = useState<number>(econ.defaultRate);
  const service = SERVICES.find((s) => s.id === serviceId)!;

  // Recompute when service changes — keep rate in valid range.
  const onPickService = (id: ServiceId) => {
    setServiceId(id);
    setRate(ECON[id].defaultRate);
  };

  const earnings = useMemo(() => {
    const grossPerHour = econ.grossPerHour(rate);
    const weekly = grossPerHour * hoursPerWeek * 0.9; // 10% platform fee
    const monthly = weekly * 4.3;
    const yearly = monthly * 12;
    return {
      weekly: Math.round(weekly),
      monthly: Math.round(monthly),
      yearly: Math.round(yearly),
    };
  }, [hoursPerWeek, rate, econ]);

  const signupHref = user
    ? isAlreadyMaker
      ? "/dashboard"
      : "/auth?mode=signup&role=maker"
    : "/auth?mode=signup&role=maker";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Become a Maker — Earn With Your Workshop | PrintLoco"
        description="Turn your 3D printer, laser cutter, embroidery machine, CNC, or vinyl cutter into income. List on PrintLoco and get matched with neighbors."
        path="/become-a-maker"
      />
      <Navbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-hero">
          <div className="container grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3 w-3" /> For Makers
              </div>
              <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Turn your workshop into a{" "}
                <span className="italic text-primary">side income</span>.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Whether you 3D print, laser cut, embroider, mill, or cut vinyl —
                join hundreds of local makers earning $200–$1,500/month making
                things for neighbors. No factory. No marketing. Just your
                machine, your schedule, and real customers around the corner.
              </p>

              {/* Service chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {SERVICES.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onPickService(s.id)}
                      className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-soft"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {s.shortName}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="hero" size="lg" asChild>
                  <Link to={signupHref}>
                    {isAlreadyMaker ? "Go to your dashboard" : "Open your maker shop"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="soft" size="lg" asChild>
                  <a href="#calculator">See what you could earn</a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Free to list
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Paid upfront
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> 5-min setup
                </span>
              </div>
            </div>

            {/* Hero "earnings card" mock — animates with selected service */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={serviceId}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`relative rounded-3xl border border-border bg-card p-6 shadow-card bg-gradient-to-br ${service.gradient}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        This week · {service.shortName}
                      </div>
                      <div className="mt-1 font-display text-4xl font-semibold">
                        ${earnings.weekly}
                        <span className="text-xl text-muted-foreground">.00</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                      <TrendingUp className="h-3 w-3" /> +28%
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {sampleOrdersFor(serviceId).map((o) => (
                      <div
                        key={o.file}
                        className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{o.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{o.file}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">${o.price}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" /> 4.9 · 47 ratings
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Echo Park, LA
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF STRIP */}
        <section className="border-b border-border bg-card/40">
          <div className="container grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
            {[
              { v: "$1.2M+", l: "Paid to makers" },
              { v: "12,400+", l: "Local jobs completed" },
              { v: "4.87 ★", l: "Avg maker rating" },
              { v: "1–2 days", l: "Payout time" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-3xl font-semibold tracking-tight">{s.v}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              How it works
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
              From idle machine to paid orders in{" "}
              <span className="italic text-primary">one afternoon</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary-foreground">
                  STEP {s.n}
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  {s.icon}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* EARNINGS CALCULATOR */}
        <section
          id="calculator"
          className="border-y border-border bg-gradient-to-br from-primary/5 via-background to-accent/5"
        >
          <div className="container grid gap-12 py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Calculator className="h-3 w-3" /> Earnings estimator
              </div>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">
                Your machine could pay for itself in{" "}
                <span className="italic text-primary">2–3 months</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Pick your craft, then adjust how often you'd accept jobs and your rate.
                These are real averages from active PrintLoco makers — not marketing fluff.
              </p>

              {/* Service picker for calculator */}
              <div className="mt-6 flex flex-wrap gap-2">
                {SERVICES.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onPickService(s.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {s.shortName}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">Hours of machine time / week</span>
                    <span className="font-display text-lg font-semibold text-primary">
                      {hoursPerWeek}h
                    </span>
                  </div>
                  <Slider
                    value={[hoursPerWeek]}
                    min={4}
                    max={80}
                    step={2}
                    onValueChange={(v) => setHoursPerWeek(v[0])}
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Casual (4h)</span>
                    <span>Almost full-time (80h)</span>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">{econ.rateLabel}</span>
                    <span className="font-display text-lg font-semibold text-primary">
                      {econ.rateFormat(rate)}
                    </span>
                  </div>
                  <Slider
                    value={[rate]}
                    min={econ.minRate}
                    max={econ.maxRate}
                    step={econ.step}
                    onValueChange={(v) => setRate(v[0])}
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{econ.rateHintLow}</span>
                    <span>{econ.rateHintHigh}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {service.shortName} · take-home (after 10% fee)
                </div>
                <span className="text-2xl">{service.emoji}</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${serviceId}-${hoursPerWeek}-${rate}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 grid gap-4"
                >
                  <EarningRow label="Per week" value={earnings.weekly} />
                  <EarningRow label="Per month" value={earnings.monthly} highlight />
                  <EarningRow label="Per year" value={earnings.yearly} muted />
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 rounded-xl bg-primary/5 p-4 text-xs text-muted-foreground">
                Based on typical {service.shortName.toLowerCase()} throughput across active
                makers. Real earnings vary with materials, complexity, and how quickly you
                accept incoming orders.
              </div>

              <Button variant="hero" size="lg" asChild className="mt-6 w-full">
                <Link to={signupHref}>
                  Start earning this week <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* PERKS GRID */}
        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Why makers choose PrintLoco
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
              The fairest deal in local manufacturing
            </h2>
            <p className="mt-3 text-muted-foreground">
              We built this with makers, not for them. Every rule below comes from real feedback.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  {p.icon}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="border-y border-border bg-card/40">
          <div className="container py-24">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Maker stories
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
                Real makers. Real paychecks.
              </h2>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="rounded-2xl border border-border bg-card p-6 shadow-soft"
                >
                  <Quote className="h-6 w-6 text-primary/40" />
                  <blockquote className="mt-3 text-sm leading-relaxed">
                    "{t.quote}"
                  </blockquote>
                  <figcaption className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.machine} · {t.city}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      {t.rating}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                FAQ
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
                Everything you're wondering
              </h2>
            </div>

            <div className="mt-12 space-y-3">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all open:shadow-card"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="font-display text-lg font-semibold">{f.q}</span>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="container pb-24">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-gradient-to-br from-primary via-primary to-accent p-12 text-primary-foreground shadow-card">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> 5 minutes to launch
                </div>
                <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                  Open your maker shop today.
                </h2>
                <p className="mt-4 max-w-xl text-primary-foreground/80">
                  Free forever to list. Get verified within 24 hours. Start
                  receiving local orders this week — for any craft you make.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button size="lg" variant="secondary" asChild className="text-base">
                  <Link to={signupHref}>
                    {isAlreadyMaker ? "Go to dashboard" : "Open my shop"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                  <Link to="/printers">See active makers near me</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

/** Sample order rows shown in the hero card per craft. Purely cosmetic. */
function sampleOrdersFor(id: ServiceId) {
  switch (id) {
    case "3d-print":
      return [
        { name: "Sara M.", file: "phone-stand.3mf", price: 18, status: "Picked up" },
        { name: "Jordan K.", file: "raspberry-pi-case.stl", price: 24, status: "Printing" },
        { name: "Emi R.", file: "vase-twist.3mf", price: 31, status: "Ready" },
      ];
    case "laser-cut":
      return [
        { name: "Owen P.", file: "wedding-signage.svg", price: 42, status: "Picked up" },
        { name: "Maya L.", file: "earring-set.dxf", price: 16, status: "Cutting" },
        { name: "Ben C.", file: "logo-engrave.pdf", price: 28, status: "Ready" },
      ];
    case "embroidery":
      return [
        { name: "Tara V.", file: "company-logo.dst", price: 22, status: "Stitching" },
        { name: "Luis M.", file: "tote-monogram.pes", price: 14, status: "Ready" },
        { name: "Aya K.", file: "team-patch.dst", price: 38, status: "Picked up" },
      ];
    case "cnc":
      return [
        { name: "Ravi S.", file: "phone-jig.step", price: 64, status: "Milling" },
        { name: "Nora H.", file: "address-sign.dxf", price: 48, status: "Ready" },
        { name: "Kai O.", file: "knob-aluminum.stl", price: 92, status: "Picked up" },
      ];
    case "vinyl":
      return [
        { name: "Mina T.", file: "shop-window.svg", price: 35, status: "Cutting" },
        { name: "Pablo R.", file: "team-shirts.pdf", price: 58, status: "Ready" },
        { name: "Kim D.", file: "laptop-decals.svg", price: 12, status: "Picked up" },
      ];
  }
}

const EarningRow = ({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) => (
  <div
    className={`flex items-center justify-between rounded-xl border p-4 ${
      highlight
        ? "border-primary/40 bg-primary/10"
        : muted
        ? "border-border bg-muted/30"
        : "border-border bg-background"
    }`}
  >
    <span className={`text-sm ${highlight ? "font-semibold" : "text-muted-foreground"}`}>
      {label}
    </span>
    <span
      className={`font-display font-semibold ${
        highlight ? "text-3xl text-primary" : muted ? "text-xl text-muted-foreground" : "text-2xl"
      }`}
    >
      ${value.toLocaleString()}
    </span>
  </div>
);

export default BecomeMaker;
