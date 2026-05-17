import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export const VerificationBanner = ({ isVisible }: { isVisible: boolean }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!isVisible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="sticky top-0 z-50 w-full bg-amber-100 text-amber-900 border-b border-amber-200"
      >
        <div className="container flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-semibold">Please verify your account to unlock all features.</span>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="border-amber-300 bg-white hover:bg-amber-50">
              Verify Now
            </Button>
            <button onClick={() => setDismissed(true)} className="hover:bg-amber-200 p-1 rounded-full">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
