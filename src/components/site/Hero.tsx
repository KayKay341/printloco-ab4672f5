import { Button } from "@/components/ui/button";
import { MapPin, Search, Upload, Star } from "lucide-react";
import heroImg from "@/assets/hero-printer.jpg";

const Hero = () => (
  <section className="relative overflow-hidden bg-gradient-hero">
    <div className="grain absolute inset-0 opacity-60" aria-hidden />
    <div className="container relative grid gap-12 py-16 lg:grid-cols-12 lg:gap-8 lg:py-24">
      {/* Left */}
      <div className="lg:col-span-7 lg:pr-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Now serving 142 neighborhoods · Same-day printing
        </div>

        <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Every neighborhood
          <br />
          has a <span className="italic text-primary">3D printer.</span>
          <br />
          <span className="text-accent">Find yours.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
          PrintLocal connects you with trusted makers within 10 miles. Upload an
          STL, get a quote in seconds, pick up your print today — not in three weeks.
        </p>

        {/* Search card */}
        <div className="mt-8 rounded-3xl border border-border/80 bg-card p-2 shadow-card">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-muted/50">
              <MapPin className="h-4 w-4 text-primary" />
              <div className="text-left">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Where
                </div>
                <input
                  defaultValue="Brooklyn, NY"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
                />
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-muted/50 sm:border-l sm:border-border">
              <Search className="h-4 w-4 text-primary" />
              <div className="text-left">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Material
                </div>
                <input
                  defaultValue="PLA · Any color"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
                />
              </div>
            </label>
            <Button variant="hero" size="lg" className="rounded-2xl">
              <Upload className="h-4 w-4" /> Upload STL
            </Button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {["#FF8C42", "#2E75B6", "#1E5A8B"].map((c) => (
                <div
                  key={c}
                  className="h-7 w-7 rounded-full border-2 border-background"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span><strong className="text-foreground">2,400+</strong> active makers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span><strong className="text-foreground">4.9</strong> avg rating · 18k prints</span>
          </div>
        </div>
      </div>

      {/* Right: Image */}
      <div className="relative lg:col-span-5">
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-accent opacity-20 blur-3xl" />
          <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-card">
            <img
              src={heroImg}
              alt="A 3D printer creating an orange geometric vase in a warmly lit workshop"
              width={1600}
              height={1200}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Floating cards */}
          <div className="absolute -left-4 top-10 rounded-2xl border border-border bg-card p-4 shadow-card animate-float sm:-left-10">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live quote
            </div>
            <div className="mt-1 font-display text-2xl font-semibold">$9.40</div>
            <div className="text-xs text-muted-foreground">47g · PLA · Ready 4pm</div>
          </div>

          <div className="absolute -bottom-6 -right-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-5 shadow-card sm:-right-8">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">0.6 mi away</div>
              <div className="text-sm font-semibold">Sarah · Prospect Heights</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
