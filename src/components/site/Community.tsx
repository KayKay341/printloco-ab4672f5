import { Heart, GraduationCap, Users } from "lucide-react";
import { motion } from "framer-motion";
import classroom from "@/assets/community-classroom.jpg";

const cards = [
  {
    icon: Heart,
    title: "Pro bono for nonprofits",
    body: "Verified 501(c)(3) organizations get unlimited free prints from volunteer makers in their community.",
  },
  {
    icon: GraduationCap,
    title: "Schools & libraries",
    body: "Public schools and libraries receive a 100% subsidy on educational projects, funded by the platform.",
  },
  {
    icon: Users,
    title: "Neighborhood guilds",
    body: "Every zip code gets its own maker community: events, design challenges, and skill-shares.",
  },
];

const Community = () => (
  <section id="community" className="bg-gradient-warm py-24">
    <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="relative"
      >
        <div className="overflow-hidden rounded-[2rem] border border-border shadow-card">
          <img
            src={classroom}
            alt="A teacher and students gathered around a 3D printer in a classroom"
            loading="lazy"
            width={1200}
            height={900}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute -bottom-6 left-6 right-6 rounded-2xl border border-border bg-card p-5 shadow-card sm:left-auto sm:right-8 sm:max-w-xs">
          <div className="font-display text-3xl font-semibold text-accent">100%</div>
          <div className="text-sm text-muted-foreground">subsidy on every print for verified schools and nonprofits.</div>
        </div>
      </motion.div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Community first
        </div>
        <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl text-balance">
          Manufacturing belongs to <span className="italic">everyone.</span>
        </h2>
        <p className="mt-5 max-w-lg text-muted-foreground">
          PrintLocal isn't just a marketplace — it's neighborhood infrastructure. We invest a
          portion of every transaction back into the schools, libraries, and nonprofits that share
          our zip codes.
        </p>

        <div className="mt-10 space-y-4">
          {cards.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex gap-4 rounded-2xl border border-border bg-card/70 p-5 backdrop-blur transition-colors hover:bg-card"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default Community;
