import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AUTH_INIT_TIMEOUT_MS = 4500;
const AUTH_RESUME_TIMEOUT_MS = 5000;

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

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Auth request timed out")), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string, isActive: () => boolean = () => true) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, neighborhood, zip_code, phone")
        .eq("id", uid)
        .maybeSingle();
      if (isActive()) setProfile((data as Profile) ?? null);
    } catch {
      if (isActive()) setProfile(null);
    }
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

  useEffect(() => {
    let cancelled = false;

    const refreshAfterResume = async () => {
      if (document.visibilityState === "hidden") return;

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (cancelled) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    window.addEventListener("focus", refreshAfterResume);
    window.addEventListener("online", refreshAfterResume);
    window.addEventListener("pageshow", refreshAfterResume);
    document.addEventListener("visibilitychange", refreshAfterResume);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAfterResume);
      window.removeEventListener("online", refreshAfterResume);
      window.removeEventListener("pageshow", refreshAfterResume);
      document.removeEventListener("visibilitychange", refreshAfterResume);
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

const FALLBACK_AUTH: AuthContextValue = {
  user: null,
  session: null,
  profile: null,
  loading: false,
  signOut: async () => {},
  refreshProfile: async () => {},
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  // Graceful fallback during HMR or if a consumer renders outside the provider,
  // so a missing context never produces a blank screen.
  return ctx ?? FALLBACK_AUTH;
};
