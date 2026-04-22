import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";

/**
 * Demo mode is active for everyone who is NOT an admin.
 * Public visitors get a fully-browsable demo of the entire site;
 * real money / real maker writes / real publishing only fire for admins.
 */
export const useDemoMode = () => {
  const { isAdmin, loading } = useIsAdmin();
  const isDemo = !loading && !isAdmin;

  const demoToast = (action = "do that") => {
    toast.info("You're in demo mode", {
      description: `Sign in as admin to ${action} for real. Everything else still works — explore freely.`,
    });
  };

  return { isDemo, isAdmin, loading, demoToast };
};
