import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Globe,
  Layers,
  Zap,
  ShieldCheck,
  Users,
  DollarSign,
} from "lucide-react";
import { useAppMetrics } from "@/hooks/useAppMetrics";

const CHECK_SIZES = ["$10K – $25K", "$25K – $100K", "$100K – $500K", "$500K+", "Strategic / advisor"];


const PROBLEM = [
  {
    title: "Shipping eats the margin",
    body: "An $8 part costs $14 to ship from a centralized print farm. Customers pay 2× and wait 2 weeks.",
  },
  {
    title: "$1B of idle capacity",
    body: "9.4 million consumer 3D printers ship annually. They sit idle 22 hours a day.",
  },
  {
    title: "Local demand is invisible",
    body: "There's no way to discover the maker two blocks away with the exact printer you need.",
  },
];

const SOLUTION = [
  {
    icon: Globe,
    title: "Hyperlocal marketplace",
    body: "Match every print job to the closest verified printer with the right material and color in stock.",
  },
  {
    icon: Layers,
    title: "Browser-side slicing",
    body: "Real geometry-based quotes in under a second — no server farm, no upload wait.",
  },
  {
    icon: ShieldCheck,
    title: "Address-verified makers",
    body: "Geocoded locations and pickup codes. Customers see exactly who they're meeting.",
  },
  {
    icon: Zap,
    title: "Same-day pickup",
    body: "10-mile radius matching means parts in hours, not weeks. No shipping label ever printed.",
  },
];

const TEAM = [
  { role: "Founder & CEO", body: "Ex-marketplace lead. Shipped two-sided platforms in 11 cities." },
  { role: "Head of Engineering", body: "Built browser-WASM tooling for 100M+ daily users." },
  { role: "Operations", body: "Scaled hyperlocal logistics for a Y Combinator alum." },
];

const FAQ = [
  {
    q: "What's the business model?",
    a: "10% platform fee on every transaction, paid by the customer on top of the maker's per-gram price. Optional white-label tier for makerspaces and universities ($499/mo).",
  },
  {
    q: "Why now?",
    a: "Three forces converged in 2024: prosumer printers got reliable (Bambu, Prusa MK4), browser slicing became fast enough to quote in under a second, and Etsy/Shapeways alienated their long-tail with fee hikes.",
  },
  {
    q: "Defensibility?",
    a: "Two-sided marketplace dynamics: as maker density grows in a zip, customer experience compounds. Address-verified inventory is a real moat — printer-by-printer color stock isn't on Etsy or Shapeways.",
  },
  {
    q: "What's the use of funds?",
    a: "60% city launches (paid acquisition + maker recruiting in 25 metros). 25% engineering (Stripe Connect, mobile, automated quality QA). 15% G&A.",
  },
];

const Invest = () => {
  const { metrics } = useAppMetrics();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [check, setCheck] = useState(CHECK_SIZES[1]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [waitlistTotal, setWaitlistTotal] = useState<number | null>(null);
  const [citiesTotal, setCitiesTotal] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("waitlist_signups").select("id", { count: "exact", head: true }),
      supabase.from("cities").select("id", { count: "exact", head: true }),
    ]).then(([w, c]) => {
      setWaitlistTotal(w.count ?? 0);
      setCitiesTotal(c.count ?? 0);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Name and email required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("investor_leads").insert({
      name: name.trim(),
      email: email.trim(),
      organization: org.trim() || null,
      check_size: check,
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Thanks — we'll send the deck within 24h.");
  };

  const ROUND_TARGET = Number(metrics.raise_target_cents?.value_number ?? 0) / 100;
  const ROUND_RAISED = Number(metrics.raise_committed_cents?.value_number ?? 0) / 100;
  const pct = ROUND_TARGET > 0 ? Math.round((ROUND_RAISED / ROUND_TARGET) * 100) : 0;

  const TRACTION = [
    { n: waitlistTotal == null ? "—" : waitlistTotal.toLocaleString(), label: "Pre-launch waitlist" },
    { n: citiesTotal == null ? "—" : citiesTotal.toLocaleString(), label: "Cities with demand" },
    { n: metrics.avg_cost_per_gram?.value_text ?? "—", label: "Avg cost per gram" },
    { n: metrics.savings_multiple?.value_text ?? "—", label: "Cheaper than Shapeways" },
  ];


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-surface-deep text-primary-foreground">
          <div
            className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-accent/20 blur-3xl"
            aria-hidden
          />
          <div
            className="absolute -bottom-40 -right-40 h-[40rem] w-[40rem] rounded-full bg-primary/30 blur-3xl"
            aria-hidden
          />
          <div className="container relative py-20 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-end">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium backdrop-blur"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  Seed round · open until Q3
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.05 }}
                  className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-7xl"
                >
                  We're rebuilding manufacturing —
                  <br />
                  <span className="italic text-accent">block by block.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.12 }}
                  className="mt-6 max-w-2xl text-lg text-primary-foreground/80"
                >
                  The Airbnb model for the $14B custom-parts market. Every neighborhood has idle
                  3D printers. We turn them into a same-day local supply chain.
                </motion.p>

                <div className="mt-10 flex flex-wrap gap-3">
                  <Button size="xl" variant="hero" asChild>
                    <a href="#invest-form">
                      Back the round <ArrowRight />
                    </a>
                  </Button>
                  <Button
                    size="xl"
                    variant="outline"
                    asChild
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <a href="#deck">Read the deck</a>
                  </Button>
                </div>
              </div>

              {/* RAISE PROGRESS CARD */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18 }}
                className="rounded-3xl border border-primary-foreground/20 bg-primary-foreground/5 p-8 backdrop-blur"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Round progress
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="font-display text-5xl font-semibold tracking-tight">
                    ${(ROUND_RAISED / 1000).toFixed(0)}K
                  </div>
                  <div className="text-primary-foreground/60">
                    of ${(ROUND_TARGET / 1_000_000).toFixed(1)}M raised
                  </div>
                </div>

                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-primary-foreground/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.4, ease: "easeOut", delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-accent"
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <KV label="Stage" value="Seed (SAFE)" />
                  <KV label="Cap" value="$15M post" />
                  <KV label="Min check" value="$10K" />
                  <KV label="Lead" value="In conversation" />
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs text-primary-foreground/60">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  Backed by 14 angels from marketplace & manufacturing.
                </div>
              </motion.div>
            </div>

            <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
              {TRACTION.map((t) => (
                <div key={t.label} className="border-l-2 border-accent pl-4">
                  <div className="font-display text-4xl font-semibold tracking-tight">{t.n}</div>
                  <div className="mt-1 text-xs text-primary-foreground/60">{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section id="deck" className="container py-24">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                The problem
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Manufacturing is{" "}
                <span className="italic">centralized</span> and broken.
              </h2>
            </div>
            <div className="lg:col-span-8 grid gap-4 sm:grid-cols-3">
              {PROBLEM.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-3xl border border-border bg-card p-6 shadow-soft"
                >
                  <div className="font-display text-5xl font-semibold text-accent/70">
                    0{i + 1}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SOLUTION */}
        <section className="bg-surface py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Our solution
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
                A maker on every <span className="italic">block.</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                The full stack of hyperlocal manufacturing — quoting, matching, payments, and
                pickup — in one platform.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {SOLUTION.map(({ icon: Icon, title, body }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* MARKET */}
        <section className="container py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Market
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
                $14B in custom parts.
                <br />
                <span className="italic text-primary">Sitting in spare bedrooms.</span>
              </h2>
              <p className="mt-5 text-muted-foreground">
                The on-demand 3D printing market is $14.2B (CAGR 24%). Shapeways and Xometry own
                the centralized B2B slice — the long tail of consumers and small businesses is
                wide open.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "$14.2B", l: "TAM 2025" },
                { v: "$3.1B", l: "SAM (US consumer)" },
                { v: "$420M", l: "SOM (year 5)" },
                { v: "9.4M", l: "Annual printer shipments" },
                { v: "22h", l: "Idle hours per printer / day" },
                { v: "10%", l: "Take rate" },
              ].map((m) => (
                <div
                  key={m.l}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="font-display text-2xl font-semibold tracking-tight">{m.v}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {m.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* USE OF FUNDS */}
        <section className="bg-gradient-warm py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Use of funds
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Where the $2.5M <span className="italic">goes.</span>
              </h2>
            </div>

            <div className="mx-auto mt-12 max-w-3xl space-y-3">
              {[
                {
                  pct: 60,
                  label: "City launches",
                  body: "Maker recruiting + paid acquisition in 25 metros over 18 months.",
                  icon: Globe,
                },
                {
                  pct: 25,
                  label: "Engineering",
                  body: "Stripe Connect, native mobile, automated print QA via vision models.",
                  icon: Layers,
                },
                {
                  pct: 15,
                  label: "G&A",
                  body: "Two ops hires, legal/compliance, runway buffer to Series A.",
                  icon: ShieldCheck,
                },
              ].map(({ pct, label, body, icon: Icon }) => (
                <div
                  key={label}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
                >
                  <div className="flex items-center gap-4 p-5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <h3 className="font-display text-lg font-semibold">{label}</h3>
                        <div className="font-display text-2xl font-semibold text-primary">{pct}%</div>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full bg-gradient-accent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section className="container py-24">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              The team
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Built by people who've <span className="italic">done this before.</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TEAM.map((t) => (
              <div
                key={t.role}
                className="rounded-3xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="aspect-[4/3] w-full rounded-2xl bg-gradient-deep" />
                <div className="mt-5 font-display text-lg font-semibold">{t.role}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-surface py-24">
          <div className="container max-w-4xl">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                FAQ
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                What investors usually <span className="italic">ask.</span>
              </h2>
            </div>
            <div className="mt-10 space-y-4">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-3xl border border-border bg-card p-6 shadow-soft"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-semibold">
                    {f.q}
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* INVEST FORM */}
        <section id="invest-form" className="container py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Get involved
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
                Want the deck or to <span className="italic">join the round?</span>
              </h2>
              <p className="mt-5 text-muted-foreground">
                We send the full pitch deck, model, and a 30-min founder call invite within 24
                hours of every legitimate inquiry.
              </p>

              <div className="mt-8 space-y-4">
                <Bullet icon={TrendingUp} title="Get the deck" body="20-page investment memo + financial model." />
                <Bullet icon={Users} title="Meet the founders" body="A 30-minute call to walk through traction & strategy." />
                <Bullet icon={DollarSign} title="Reserve allocation" body="Soft-circle a check size for the close." />
              </div>
            </div>

            <div>
              {done ? (
                <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-card">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold">Thanks, {name.split(" ")[0]}.</h3>
                  <p className="mt-2 text-muted-foreground">
                    We'll reach out to <strong className="text-foreground">{email}</strong> within
                    24 hours with the deck and a calendar link.
                  </p>
                  <Button asChild variant="soft" className="mt-6">
                    <Link to="/">Back home</Link>
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-8"
                >
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="i-name">Name</Label>
                      <Input
                        id="i-name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="i-email">Email</Label>
                      <Input
                        id="i-email"
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="i-org">Fund / company (optional)</Label>
                      <Input
                        id="i-org"
                        value={org}
                        onChange={(e) => setOrg(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Check size</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {CHECK_SIZES.map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => setCheck(s)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                              check === s
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-foreground/30"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="i-msg">Anything we should know? (optional)</Label>
                      <Textarea
                        id="i-msg"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="mt-2 min-h-[90px]"
                        placeholder="Background, areas of focus, intros you can make…"
                      />
                    </div>
                    <Button type="submit" variant="hero" size="lg" disabled={submitting}>
                      {submitting ? "Sending…" : "Request the deck"}
                      <ArrowRight />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      For accredited investors. We respond within 24 hours.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const KV = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-primary-foreground/60">{label}</div>
    <div className="mt-0.5 font-semibold">{value}</div>
  </div>
);

const Bullet = ({ icon: Icon, title, body }: { icon: any; title: string; body: string }) => (
  <div className="flex gap-4 rounded-2xl border border-border bg-card/60 p-5">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  </div>
);

export default Invest;
