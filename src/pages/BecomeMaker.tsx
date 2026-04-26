import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
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
 * Etsy-style "Open your shop" landing page for makers.
 * Goal: convince hobbyists & pro printers to list their printer on PrintLoco.
 */

const STEPS = [
  {
    n: "01",
    icon: <Camera className="h-5 w-5" />,
    title: "Snap your printer",
    body: "Take 1 photo of your printer and 3 sample prints. We verify within 24h so customers trust you from day one.",
  },
  {
    n: "02",
    icon: <Package className="h-5 w-5" />,
    title: "Set your filaments & price",
    body: "List your in-stock colors, materials, and price per gram. Use our suggested rates or set your own.",
  },
  {
    n: "03",
    icon: <Zap className="h-5 w-5" />,
    title: "Get matched automatically",
    body: "When a customer uploads an STL or 3MF nearby, we match them to your printer based on size, color, and tier.",
  },
  {
    n: "04",
    icon: <DollarSign className="h-5 w-5" />,
    title: "Print, hand off, get paid",
    body: "Customer pays upfront. You print, they pick up with a code, money lands in your account next day.",
  },
];

const PERKS = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: "You're protected",
    body: "Every order is paid before you start printing. No chasing invoices. No no-shows.",
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
    title: "Print on your schedule",
    body: "Accept jobs only when your printer's free. Pause your shop in one click when you're on vacation.",
  },
  {
    icon: <HeartHandshake className="h-5 w-5" />,
    title: "Real human support",
    body: "Disputes? Tricky file? Our team has your back — and our 7-day reprint guarantee splits costs fairly.",
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: "Free tools, no monthly fee",
    body: "Smart slicer, AMS color picker, bulk quote workflow, and earnings dashboard — all included.",
  },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    city: "Echo Park, LA",
    printer: "Bambu X1C",
    rating: 4.9,
    quote:
      "Made $640 my first month — and that's just from neighbors I never would've met otherwise. PrintLoco is the side hustle I wish existed years ago.",
  },
  {
    name: "Priya R.",
    city: "Brooklyn, NY",
    printer: "Prusa MK4",
    rating: 5.0,
    quote:
      "I was nervous about strangers, but verified pickup codes and upfront payment make it feel safe. My printer pays for itself now.",
  },
  {
    name: "Diego F.",
    city: "Mission, SF",
    printer: "Bambu P1S",
    rating: 4.8,
    quote:
      "I went from 3 prints/month for friends to 30+ paid orders. The quality tiers actually reward you for doing it right.",
  },
];

const FAQ = [
  {
    q: "How much does it cost to list?",
    a: "Nothing. PrintLoco only takes a small platform fee on completed orders — no listing fees, no monthly charges, no cancellation penalties.",
  },
  {
    q: "What printers can I list?",
    a: "Any FDM 3D printer in good working order. Bambu, Prusa, Creality, Voron, Anycubic — they all qualify. Resin/SLA support is coming next.",
  },
  {
    q: "How fast do I get paid?",
    a: "Payments arrive in your bank account 1–2 business days after the customer picks up and confirms.",
  },
  {
    q: "What if a print fails or there's a dispute?",
    a: "Our 7-day reprint guarantee splits the cost of a reprint when something goes wrong. Most disputes resolve in under 48 hours.",
  },
  {
    q: "Do I need to be home for pickups?",
    a: "Yes, but you control your pickup window. Most makers set evening or weekend slots. Pickup codes confirm the right buyer.",
  },
];

const BecomeMaker = () => {
  const { user, profile } = useAuth();
  const isAlreadyMaker = profile?.role === "maker";

  // Earnings calculator state
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(20);
  const [pricePerGram, setPricePerGram] = useState<number>(0.2);

  // Rough model: assume avg printer = ~15g/hr at $0.20/g = $3/hr revenue,
  // platform fee ~10%. Scale linearly.
  const earnings = useMemo(() => {
    const gramsPerHour = 15;
    const grossPerHour = gramsPerHour * pricePerGram;
    const weekly = grossPerHour * hoursPerWeek * 0.9;
    const monthly = weekly * 4.3;
    const yearly = monthly * 12;
    return {
      weekly: Math.round(weekly),
      monthly: Math.round(monthly),
      yearly: Math.round(yearly),
    };
  }, [hoursPerWeek, pricePerGram]);

  const signupHref = user
    ? isAlreadyMaker
      ? "/dashboard"
      : "/auth?mode=signup&role=maker"
    : "/auth?mode=signup&role=maker";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Become a Maker — Earn With Your 3D Printer | PrintLoco"
        description="Turn your idle 3D printer into income. List on PrintLoco, get matched with neighbors, print on your schedule, and get paid fast."
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
                Turn your 3D printer into a{" "}
                <span className="italic text-primary">side income</span>.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Join hundreds of local makers earning $200–$1,500/month
                printing for neighbors. No factory. No marketing. Just your
                printer, your schedule, and real customers around the corner.
              </p>

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

            {/* Hero "earnings card" mock */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
              <div className="relative rounded-3xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      This week
                    </div>
                    <div className="mt-1 font-display text-4xl font-semibold">
                      $312<span className="text-xl text-muted-foreground">.40</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                    <TrendingUp className="h-3 w-3" /> +28%
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    { name: "Sara M.", file: "phone-stand.3mf", price: 18, status: "Picked up" },
                    { name: "Jordan K.", file: "raspberry-pi-case.stl", price: 24, status: "Printing" },
                    { name: "Emi R.", file: "vase-twist.3mf", price: 31, status: "Ready" },
                  ].map((o) => (
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
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF STRIP */}
        <section className="border-b border-border bg-card/40">
          <div className="container grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
            {[
              { v: "$1.2M+", l: "Paid to makers" },
              { v: "12,400+", l: "Local prints completed" },
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
              From idle printer to paid orders in{" "}
              <span className="italic text-primary">one afternoon</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-soft"
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
                Your printer could pay for itself in{" "}
                <span className="italic text-primary">2–3 months</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Adjust how often you'd accept jobs and your price per gram.
                These are real averages from active PrintLoco makers — not
                marketing fluff.
              </p>

              <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">Hours of print time / week</span>
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
                    <span className="font-semibold">Price per gram</span>
                    <span className="font-display text-lg font-semibold text-primary">
                      ${pricePerGram.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[pricePerGram * 100]}
                    min={10}
                    max={50}
                    step={1}
                    onValueChange={(v) => setPricePerGram(v[0] / 100)}
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Budget ($0.10)</span>
                    <span>Premium ($0.50)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estimated take-home (after 10% platform fee)
              </div>

              <div className="mt-6 grid gap-4">
                <EarningRow label="Per week" value={earnings.weekly} />
                <EarningRow label="Per month" value={earnings.monthly} highlight />
                <EarningRow label="Per year" value={earnings.yearly} muted />
              </div>

              <div className="mt-6 rounded-xl bg-primary/5 p-4 text-xs text-muted-foreground">
                Based on ~15 g/hr average throughput across PLA & PETG jobs. Real
                earnings vary with material, complexity, and how quickly you
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
              The fairest deal in 3D printing
            </h2>
            <p className="mt-3 text-muted-foreground">
              We built this with makers, not for them. Every rule below comes
              from real feedback.
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
                        {t.printer} · {t.city}
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
                  receiving local orders this week.
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
