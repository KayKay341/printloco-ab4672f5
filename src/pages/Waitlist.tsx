import { useState } from "react";
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
import { CheckCircle2, MapPin, Sparkles, Users, Printer, Building2, ArrowRight } from "lucide-react";

const ROLES = [
  { id: "customer", label: "I want prints", icon: Sparkles, hint: "Get parts from local makers" },
  { id: "maker", label: "I own a printer", icon: Printer, hint: "Earn from your idle printer" },
  { id: "nonprofit", label: "Nonprofit / school", icon: Building2, hint: "Free prints for your work" },
];

const Waitlist = () => {
  const [role, setRole] = useState<"customer" | "maker" | "nonprofit">("customer");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("waitlist_signups").insert({
      email: email.trim(),
      role,
      zip_code: zip.trim() || null,
      city: city.trim() || null,
      notes: notes.trim() || null,
      source: "waitlist_page",
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
    setDone(true);
    toast.success("You're in! We'll email when your neighborhood goes live.");
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
                We're rolling out city by city. Drop your zip and we'll text you the moment a maker
                within 10 miles is ready to print for you — or the moment we're ready to onboard
                yours.
              </motion.p>

              <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                <Stat n="3,200+" label="On the list" />
                <Stat n="42" label="Cities queued" />
                <Stat n="< 1 wk" label="Avg wait" />
              </div>
            </div>

            {/* FORM */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="relative"
            >
              {done ? (
                <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-card">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold">You're on the list.</h3>
                  <p className="mt-2 text-muted-foreground">
                    We'll email <strong className="text-foreground">{email}</strong> when your zip
                    is live. In the meantime, want to skip the line?
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button variant="hero" asChild>
                      <Link to="/invest">Help us launch faster →</Link>
                    </Button>
                    <Button variant="soft" asChild>
                      <Link to="/upload">Try the live demo</Link>
                    </Button>
                  </div>
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
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Brooklyn"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="notes">
                      {role === "maker"
                        ? "What printer(s) do you own?"
                        : role === "nonprofit"
                          ? "Tell us about your organization"
                          : "What do you want to print?"}{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder={
                        role === "maker"
                          ? "Bambu X1C, Prusa MK4, Form 3…"
                          : role === "nonprofit"
                            ? "501(c)(3) hospital robotics club"
                            : "Drone parts, miniatures, replacement knobs…"
                      }
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-2 min-h-[80px]"
                    />
                  </div>

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
                    No spam. Just a single email when we're live in {city || "your area"}.
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        </section>

        {/* WHY */}
        <section className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Why join now
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
              Early waitlist gets the <span className="italic">good stuff.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Founding price",
                body: "First 1,000 customers locked in at 10% lifetime discount on every print.",
              },
              {
                icon: Printer,
                title: "Founding maker badge",
                body: "First makers in each zip get a permanent verified badge and top-of-list placement.",
              },
              {
                icon: MapPin,
                title: "We come to you",
                body: "We launch the cities with the most signups first. Bring friends to skip the line.",
              },
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

const Stat = ({ n, label }: { n: string; label: string }) => (
  <div>
    <div className="font-display text-3xl font-semibold tracking-tight">{n}</div>
    <div className="mt-1 text-xs text-muted-foreground">{label}</div>
  </div>
);

export default Waitlist;
