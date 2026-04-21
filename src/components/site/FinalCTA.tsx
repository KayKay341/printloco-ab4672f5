import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => (
  <section className="container pb-24">
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-accent p-10 text-accent-foreground shadow-glow sm:p-16">
      <div
        className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-foreground/10 blur-3xl"
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
            Drop your STL, pick a maker around the corner, and skip the two-week wait. Your community is ready.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Button size="xl" className="bg-surface-deep text-primary-foreground hover:bg-foreground">
            Upload a file <ArrowRight />
          </Button>
          <Button size="xl" variant="outline" className="border-foreground/30 text-foreground hover:bg-foreground/10">
            I have a printer
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTA;
