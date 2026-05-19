import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AUTH_INIT_TIMEOUT_MS = 4500;

type Profile = {
  id: string;
  full_name: string | null;
  role: "customer" | "maker";
  neighborhood: string | null;
  zip_code: string | null;
  phone: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, neighborhood, zip_code, phone")
      .eq("id", uid)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    let mounted = true;
    const finishLoading = () => {
      if (mounted) setLoading(false);
    };

    // CRITICAL: set up listener first, then check existing session
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(newSession.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    const timeout = window.setTimeout(finishLoading, AUTH_INIT_TIMEOUT_MS);

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!mounted) return;
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) loadProfile(existing.user.id);
      finishLoading();
    }).catch(() => {
      if (!mounted) return;
      setSession(null);
      setUser(null);
      setProfile(null);
      finishLoading();
    }).finally(() => window.clearTimeout(timeout));

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
