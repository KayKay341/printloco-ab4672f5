import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  CheckCircle2, MapPin, Sparkles, Users, Printer, Building2,
  ArrowRight, Upload as UploadIcon, Handshake, Package,
  Copy, Twitter, Mail as MailIcon, Heart, ShieldCheck, Leaf,
  Trophy, RefreshCw,
} from "lucide-react";
import { POPULAR_PRINTER_OPTIONS } from "@/lib/popularPrinters";

type City = {
  id: string; name: string; slug: string;
  status: "waitlist" | "launching" | "live";
  launch_date: string | null; signup_count: number;
};

type ReferralStat = {
  total: number;
  masked_email: string;
  city: string | null;
  joined_at: string;
};

const REFERRAL_STORAGE_KEY = "printlocal_referral";

const ROLES = [
  { id: "customer", label: "I want prints", icon: Sparkles, hint: "Get parts from local makers" },
  { id: "maker", label: "I own a printer", icon: Printer, hint: "Earn from your idle printer" },
  { id: "nonprofit", label: "Nonprofit / school", icon: Building2, hint: "Free prints for your work" },
];

const STATUS_LABEL: Record<City["status"], string> = {
  waitlist: "Waitlist",
  launching: "Launching soon",
  live: "Live now",
};

const Waitlist = () => {
  const [params] = useSearchParams();
  const [role, setRole] = useState<"customer" | "maker" | "nonprofit">("customer");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [printerModel, setPrinterModel] = useState<string>("");
  const [printerOther, setPrinterOther] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralStat[]>([]);
  const [refreshingRefs, setRefreshingRefs] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const referredBy = params.get("ref");

  // Load saved referral code from prior signup on this device
  useEffect(() => {
    const saved = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { code: string; email: string };
        setReferralCode(parsed.code);
        setEmail(parsed.email);
        setDone(true);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    supabase
      .from("cities")
      .select("*")
      .order("signup_count", { ascending: false })
      .then(({ data }) => setCities((data as City[]) ?? []));
  }, []);

  const loadReferrals = async (code: string) => {
    setRefreshingRefs(true);
    const { data, error } = await supabase.rpc("get_referral_stats", { _code: code });
    setRefreshingRefs(false);
    if (error) {
      console.error(error);
      return;
    }
    setReferrals((data as ReferralStat[]) ?? []);
  };

  useEffect(() => {
    if (referralCode) loadReferrals(referralCode);
  }, [referralCode]);

  const referralUrl = useMemo(
    () => referralCode ? `${window.location.origin}/waitlist?ref=${referralCode}` : "",
    [referralCode],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setSubmitting(true);
    // Generate referral code client-side so we don't need SELECT permission after insert
    const code = Math.random().toString(36).slice(2, 10);
    const composedNotes = role === "maker"
      ? [printerModel === "Other" ? printerOther.trim() : printerModel, notes.trim()]
          .filter(Boolean)
          .join(" — ") || null
      : notes.trim() || null;
    const { error } = await supabase
      .from("waitlist_signups")
      .insert({
        email: email.trim(),
        role,
        zip_code: zip.trim() || null,
        city: city.trim() || null,
        notes: composedNotes,
        source: "waitlist_page",
        referred_by: referredBy,
        referral_code: code,
      });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.success("You're already on the list — we'll be in touch.");
        setDone(true);
      } else {
        toast.error(error.message);
      }
      return;
    }
    setReferralCode(code);
    setDone(true);
    localStorage.setItem(
      REFERRAL_STORAGE_KEY,
      JSON.stringify({ code, email: email.trim() }),
    );
    toast.success("You're in! We'll email when your neighborhood goes live.");
  };

  const resetSignup = () => {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    setReferralCode(null);
    setReferrals([]);
    setDone(false);
    setEmail("");
  };

  const copyReferral = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    toast.success("Referral link copied — share to bump your city up");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-hero">
          <div className="grain absolute inset-0 opacity-60" aria-hidden />
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" aria-hidden />

          <div className="container relative grid gap-12 py-20 lg:grid-cols-2 lg:py-28">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Launching neighborhood by neighborhood
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05 }}
                className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl"
              >
                Be first when{" "}
                <span className="italic text-primary">PrintLocal</span> opens
                <br />
                in your <span className="text-accent">neighborhood.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.12 }}
                className="mt-6 max-w-xl text-lg text-muted-foreground"
              >
                A 3D printer on every block. Drop your zip and we'll email the moment a maker
                within 10 miles is ready to print for you — or the moment we're ready to onboard
                yours.
              </motion.p>

              <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                <Stat n="3,200+" label="On the list" />
                <Stat n={`${cities.length || 4}`} label="Cities queued" />
                <Stat n="< 1 wk" label="Avg wait" />
              </div>

              {referredBy && (
                <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm">
                  <Heart className="h-4 w-4 text-accent" />
                  Referred by a neighbor — your signup bumps your city up the queue.
                </div>
              )}
            </div>

            {/* FORM */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="relative"
            >
              {done ? (
                <div className="rounded-3xl border border-border bg-card p-8 shadow-card sm:p-10">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-center font-display text-2xl font-semibold">
                    You're on the list.
                  </h3>
                  <p className="mt-2 text-center text-muted-foreground">
                    We'll email <strong className="text-foreground">{email}</strong> when your zip
                    is live.
                  </p>

                  {referralCode && (
                    <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                          Your referral dashboard
                        </div>
                        <button
                          type="button"
                          onClick={() => loadReferrals(referralCode)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Refresh referrals"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshingRefs ? "animate-spin" : ""}`} />
                        </button>
                      </div>

                      {/* Code + counts */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border bg-background p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Your code
                          </div>
                          <div className="mt-1 font-display text-2xl font-semibold tracking-tight">
                            {referralCode}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <Trophy className="h-3 w-3" /> Friends joined
                          </div>
                          <div className="mt-1 font-display text-2xl font-semibold tracking-tight text-accent">
                            {referrals[0]?.total ?? 0}
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-muted-foreground">
                        We launch cities with the most signups first. Each friend who joins from your link
                        bumps your city up the queue.
                      </p>

                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                        <code className="flex-1 truncate text-xs">{referralUrl}</code>
                        <Button size="sm" variant="ghost" onClick={copyReferral}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="soft" asChild>
                          <a
                            target="_blank"
                            rel="noreferrer"
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                              `I just joined the PrintLocal waitlist — a 3D printer on every block. Get on the list (and bump our city up):`,
                            )}&url=${encodeURIComponent(referralUrl)}`}
                          >
                            <Twitter className="h-3.5 w-3.5" /> Tweet it
                          </a>
                        </Button>
                        <Button size="sm" variant="soft" asChild>
                          <a
                            href={`mailto:?subject=${encodeURIComponent(
                              "Want a local 3D printer in our neighborhood?",
                            )}&body=${encodeURIComponent(
                              `PrintLocal is rolling out city by city. Each signup from this link bumps ours up: ${referralUrl}`,
                            )}`}
                          >
                            <MailIcon className="h-3.5 w-3.5" /> Email a friend
                          </a>
                        </Button>
                      </div>

                      {/* Who used it */}
                      {referrals.length > 0 && (
                        <div className="mt-5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Recent signups using your code
                          </div>
                          <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-background">
                            {referrals.slice(0, 8).map((r, i) => (
                              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                                <span className="truncate font-mono">{r.masked_email}</span>
                                <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                                  {r.city && <span className="hidden sm:inline">{r.city}</span>}
                                  <span>{new Date(r.joined_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button variant="hero" asChild>
                      <Link to="/upload">Try the live demo</Link>
                    </Button>
                    <Button variant="soft" asChild>
                      <Link to="/invest">See the pitch →</Link>
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={resetSignup}
                    className="mt-4 block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                  >
                    Sign up a different email →
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-8"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Join the waitlist
                  </div>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                    Reserve your spot
                  </h2>

                  <div className="mt-6">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      I'm joining as
                    </Label>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {ROLES.map((r) => (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => setRole(r.id as any)}
                          className={`group flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all ${
                            role === r.id
                              ? "border-primary bg-primary/5 shadow-soft"
                              : "border-border bg-background hover:border-foreground/30"
                          }`}
                        >
                          <div
                            className={`grid h-8 w-8 place-items-center rounded-xl ${
                              role === r.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <r.icon className="h-4 w-4" />
                          </div>
                          <div className="text-xs font-semibold leading-tight">{r.label}</div>
                          <div className="text-[10px] leading-tight text-muted-foreground">
                            {r.hint}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="you@neighborhood.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="zip">Zip code</Label>
                      <Input
                        id="zip"
                        placeholder="11215"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city-select">City</Label>
                      {cities.length > 0 ? (
                        <Select value={city} onValueChange={setCity}>
                          <SelectTrigger id="city-select" className="mt-2">
                            <SelectValue placeholder="Pick your city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((c) => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.name} · {STATUS_LABEL[c.status]}
                              </SelectItem>
                            ))}
                            <SelectItem value="other">Other / not listed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="city-select"
                          placeholder="Brooklyn"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>

                  {role === "maker" ? (
                    <div className="mt-4 space-y-3">
                      <div>
                        <Label htmlFor="printer-model">
                          What printer do you own?{" "}
                          <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Select value={printerModel} onValueChange={setPrinterModel}>
                          <SelectTrigger id="printer-model" className="mt-2">
                            <SelectValue placeholder="Pick your model" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {POPULAR_PRINTER_OPTIONS.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                            <SelectItem value="Other">Other / not listed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {printerModel === "Other" && (
                        <Input
                          placeholder="Brand and model (e.g. Sovol SV08)"
                          value={printerOther}
                          onChange={(e) => setPrinterOther(e.target.value)}
                        />
                      )}
                      <Textarea
                        placeholder="Anything else? Multiple printers, filaments you stock, hours/week available…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[70px]"
                      />
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Label htmlFor="notes">
                        {role === "nonprofit"
                          ? "Tell us about your organization"
                          : "What do you want to print?"}{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder={
                          role === "nonprofit"
                            ? "501(c)(3) hospital robotics club"
                            : "Drone parts, miniatures, replacement knobs…"
                        }
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-2 min-h-[80px]"
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="mt-6 w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Reserving your spot…" : "Reserve my spot"}
                    <ArrowRight />
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    No spam. One email when we're live in {city || "your area"}.
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        </section>

        {/* WHAT IS PRINTLOCAL */}
        <section className="container py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              The manifesto
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
              What is <span className="italic">PrintLocal?</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Most American homes are within 5 miles of an idle 3D printer. We connect
              the people who need a part — drone bracket, replacement knob, custom miniature —
              with the neighbor who already owns the machine that prints it.
            </p>
            <p className="mt-4 text-lg text-muted-foreground">
              No factories. No shipping. No middleman warehouses. Pickup is a 10-minute walk.
              Makers earn from idle hours. Customers get parts in 24 hours, not 14 days.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-muted/30 py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                How it works
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
                From file to part in <span className="italic">three steps.</span>
              </h2>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: UploadIcon, n: "01", title: "Upload your STL",
                  body: "We slice it in your browser and quote weight, time, and price live. Pick material and color.",
                },
                {
                  icon: Handshake, n: "02", title: "Match a local maker",
                  body: "We rank the closest verified makers stocking your filament. You see the exact distance and price.",
                },
                {
                  icon: Package, n: "03", title: "Pickup or short hop",
                  body: "Pay through the app, get a pickup code, walk over. 80% of orders are within 2 miles.",
                },
              ].map(({ icon: Icon, n, title, body }) => (
                <motion.div
                  key={title}
                  whileHover={{ y: -4 }}
                  className="rounded-3xl border border-border bg-card p-7 shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-display text-3xl font-semibold text-muted-foreground/30">{n}</span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Who it's for
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
              Built for <span className="italic">both sides</span> of the printer.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-border bg-card p-8 shadow-soft"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-2xl font-semibold">If you need parts</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> Hobbyist tinkerers, designers, drone repairers, cosplayers</li>
                <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> Replacement parts you can't find on Amazon</li>
                <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> 3-10x cheaper than online print farms</li>
                <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> Same-day pickup, not next-week shipping</li>
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-border bg-card p-8 shadow-soft"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Printer className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-2xl font-semibold">If you own a printer</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent mt-0.5" /> Your printer sits idle 80% of the week</li>
                <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent mt-0.5" /> Earn $200–800/mo on your existing setup</li>
                <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent mt-0.5" /> Set your own price/g and accept jobs you want</li>
                <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent mt-0.5" /> 90% goes to you, 10% to keep the network running</li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* CITIES */}
        {cities.length > 0 && (
          <section className="bg-muted/30 py-20">
            <div className="container">
              <div className="mx-auto max-w-2xl text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Cities in the queue
                </div>
                <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
                  We launch the cities with the <span className="italic">most signups</span> first.
                </h2>
              </div>

              <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-2">
                {cities.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-display text-lg font-semibold">{c.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.signup_count.toLocaleString()} on waitlist
                        {c.launch_date && ` · ETA ${new Date(c.launch_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        c.status === "live"
                          ? "bg-primary/15 text-primary"
                          : c.status === "launching"
                            ? "bg-accent/15 text-accent"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              FAQ
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
              Questions, <span className="italic">answered.</span>
            </h2>
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-2xl border border-border bg-card px-5 shadow-soft"
                >
                  <AccordionTrigger className="font-display text-base font-semibold">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* WHY NOW */}
        <section className="container pb-20">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Users, title: "Founding price", body: "First 1,000 customers locked in at 10% lifetime discount on every print." },
              { icon: ShieldCheck, title: "Founding maker badge", body: "First makers in each zip get a permanent verified badge and top-of-list placement." },
              { icon: Leaf, title: "Less waste", body: "Local pickup means no packaging, no overnight trucks, no factory minimums." },
            ].map(({ icon: Icon, title, body }) => (
              <motion.div
                key={title}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-border bg-card p-7 shadow-soft"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* INVESTOR TEASER */}
        <section className="container pb-24">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-deep p-10 text-primary-foreground shadow-card sm:p-14">
            <div
              className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
              aria-hidden
            />
            <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Backers wanted
                </div>
                <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl text-balance">
                  Help us put a 3D printer on every <span className="italic text-accent">block.</span>
                </h2>
                <p className="mt-4 max-w-md text-primary-foreground/75">
                  We're raising a seed round to bring hyperlocal manufacturing to 100 cities.
                  Read the deck and back the round.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button size="xl" variant="hero" asChild>
                  <Link to="/invest">See the pitch <ArrowRight /></Link>
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

const FAQS = [
  {
    q: "How much does a print actually cost?",
    a: "Most parts cost $3–15. We charge per gram of filament (set by each maker, typically $0.15–0.30/g). A small bracket runs ~$4. A medium phone stand ~$8. Quotes are live as soon as you upload your STL.",
  },
  {
    q: "What materials and colors can I get?",
    a: "PLA, PETG, ABS, TPU, Nylon, and Resin (SLA). Each maker lists exactly which filaments and colors they stock — we only match you to printers that have your color in stock right now.",
  },
  {
    q: "Is it safe? What about strangers' addresses?",
    a: "Maker addresses are verified but never shown publicly. You see the neighborhood and approximate distance. Pickup happens at a public spot the maker chooses (front door, lobby, café). All payments go through the platform — no cash exchanged.",
  },
  {
    q: "How fast do I get my part?",
    a: "Most jobs are accepted within an hour and printed in 4–24 hours depending on size. You get a pickup code as soon as it's done. 80% of orders are within 2 miles of the customer.",
  },
  {
    q: "I'm a maker — how do payouts work?",
    a: "You set your price per gram and accept (or skip) any incoming job. We take 10% to keep the network running; 90% goes to you. Payouts are instant after pickup is confirmed.",
  },
  {
    q: "When will you launch in my city?",
    a: "We launch cities with the most signups first. Drop your zip and share your referral link — every friend who signs up bumps your city up the queue. Founding cities get launched in 4–8 weeks.",
  },
  {
    q: "Why not just buy from Amazon or Shapeways?",
    a: "Amazon doesn't sell custom parts. Shapeways/JLC ship from a factory in 7–14 days for $25+. PrintLocal is your neighbor with a printer — same-day, walking distance, a fraction of the price.",
  },
];

const Stat = ({ n, label }: { n: string; label: string }) => (
  <div>
    <div className="font-display text-3xl font-semibold tracking-tight">{n}</div>
    <div className="mt-1 text-xs text-muted-foreground">{label}</div>
  </div>
);

export default Waitlist;
