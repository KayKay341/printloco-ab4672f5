import { useCallback, useEffect, useState } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { demoStore, type DemoState, type DemoOrder, type DemoPrinter, type DemoUpload } from "@/lib/demoStore";

/**
 * Demo mode is active for everyone who is NOT an admin.
 * Public visitors get a fully-functional simulation: orders, printers,
 * uploads, ratings, disputes. Real money / DB writes only fire for admins.
 */
export const useDemoMode = () => {
  const { isAdmin, loading } = useIsAdmin();
  const [bypassDemo, setBypassDemo] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("printloco:bypass-demo") === "true";
  });

  const toggleBypass = useCallback(() => {
    setBypassDemo((prev) => {
      const next = !prev;
      window.localStorage.setItem("printloco:bypass-demo", String(next));
      return next;
    });
  }, []);

  const isDemo = !loading && !isAdmin && !bypassDemo;

  // Live snapshot of the demo store so components re-render when it changes.
  const [snapshot, setSnapshot] = useState<DemoState>(() => demoStore.get());
  useEffect(() => {
    const unsub = demoStore.subscribe(() => setSnapshot(demoStore.get()));
    return () => { unsub(); };
  }, []);

  const demoToast = useCallback((action = "do that") => {
    toast.info("You're in demo mode", {
      description: `Sign in as admin to ${action} for real. Everything else still works — explore freely.`,
    });
  }, []);

  const createDemoOrder = useCallback(
    (input: Parameters<typeof demoStore.addOrder>[0]): DemoOrder => {
      const order = demoStore.addOrder(input);
      toast.success("Demo order placed!", {
        description: "Track it live in your dashboard. Status will auto-advance.",
      });
      return order;
    },
    []
  );

  const publishDemoPrinter = useCallback(
    (input: Parameters<typeof demoStore.addPrinter>[0]): DemoPrinter => {
      const printer = demoStore.addPrinter(input);
      toast.success("Demo printer published!", {
        description: "It now shows up in the marketplace and your dashboard.",
      });
      return printer;
    },
    []
  );

  const addDemoUpload = useCallback(
    (input: Parameters<typeof demoStore.addUpload>[0]): DemoUpload => {
      return demoStore.addUpload(input);
    },
    []
  );

  const rateDemoOrder = useCallback((id: string, stars: number, comment?: string) => {
    demoStore.rateOrder(id, stars, comment);
    toast.success(`Thanks — ${stars}★ recorded (demo).`);
  }, []);

  const disputeDemoOrder = useCallback((id: string, reason: string, description: string) => {
    demoStore.disputeOrder(id, reason, description);
    toast.success("Demo dispute filed", {
      description: "In real mode, the maker has 7 days to reprint or we refund.",
    });
  }, []);

  const resetDemo = useCallback(() => {
    demoStore.reset();
    toast.success("Demo data cleared.");
  }, []);

  return {
    isDemo,
    isAdmin,
    bypassDemo,
    loading,
    demoToast,
    // Live data
    demoOrders: snapshot.orders,
    demoPrinters: snapshot.printers,
    demoUploads: snapshot.uploads,
    bannerDismissed: snapshot.bannerDismissed,
    // Actions
    createDemoOrder,
    publishDemoPrinter,
    addDemoUpload,
    rateDemoOrder,
    disputeDemoOrder,
    resetDemo,
    toggleBypass,
    setBannerDismissed: demoStore.setBannerDismissed,
  };
};
