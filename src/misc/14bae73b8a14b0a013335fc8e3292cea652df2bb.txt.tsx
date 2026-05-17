import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";
import { SERVICES } from "@/lib/services";

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Make Anything Locally — 3D Print, Laser Cut, Embroidery & More | PrintLoco"
        description="Upload your file and get matched with a local maker for 3D printing, laser cutting, embroidery, or vinyl cutting. Real quotes in seconds."
        path="/services"
      />
      <Navbar />
      <PageTransition>
        <main className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Make something
            </div>
            <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
              What do you want to <span className="italic text-primary">make</span> today?
            </h1>
            <p className="mt-4 text-muted-foreground">
              Pick a service. Upload your file. Get a fair, research-backed quote in seconds —
              from a maker in your neighborhood.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                >
                  <Link
                    to={`/order/${s.id}`}
                    className="group relative block h-full overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
                  >
                    <div
                      className={`absolute inset-0 -z-0 bg-gradient-to-br ${s.gradient} opacity-60 transition-opacity duration-500 group-hover:opacity-100`}
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-background/80 text-primary shadow-soft backdrop-blur">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                          From ${(s.startingPriceCents / 100).toFixed(2)}
                        </span>
                      </div>

                      <h2 className="mt-6 font-display text-2xl font-semibold leading-tight">
                        {s.name}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-foreground/80">{s.tagline}</p>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {s.description}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-1.5">
                        {s.acceptedFiles.slice(0, 4).map((ext) => (
                          <span
                            key={ext}
                            className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur"
                          >
                            {ext}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        Start a {s.shortName.toLowerCase()} order
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
}
