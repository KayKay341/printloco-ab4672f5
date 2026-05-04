import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SERVICES, type ServiceId } from "@/lib/services";

type Props = {
  active: ServiceId;
};

/** Horizontal scrollable chip row. Switching scrolls smoothly to a new route. */
export default function ServicePicker({ active }: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-center gap-2">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === active;
          return (
            <Link
              key={s.id}
              to={`/order/${s.id}`}
              className="relative"
            >
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.shortName}
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="service-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
