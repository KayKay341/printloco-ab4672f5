import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import Logo from "@/components/site/Logo";
import SEO from "@/components/SEO";
import { SERVICES, type ServiceId } from "@/lib/services";

type Mode = "signup" | "signin" | "otp" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const initialMode = (params.get("mode") as Mode) === "signin" ? "signin" : "signup";
  const initialRole = params.get("role") === "maker" ? "maker" : "customer";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<"customer" | "maker">(initialRole);
  const [machines, setMachines] = useState<ServiceId[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleMachine = (id: ServiceId) =>
    setMachines((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        toast.success("Welcome to PrintLoco!");
        navigate("/dashboard", { replace: true });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
        navigate("/dashboard", { replace: true });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your email.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const sendOtp = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Code sent! Check your email.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send code");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw error;
      toast.success("Signed in.");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Invalid code");
    } finally {
      setSubmitting(false);
    }
  };

  const titleMap: Record<Mode, string> = {
    signup: "Join PrintLoco",
    signin: "Welcome back",
    otp: "Sign in with email code",
    forgot: "Reset your password",
  };
  const subtitleMap: Record<Mode, string> = {
    signup: "Get things 3D printed, laser cut, embroidered, milled & more — right in your neighborhood.",
    signin: "Sign in to continue.",
    otp: "We'll email you a 6-digit code — no password needed.",
    forgot: "We'll email you a link to set a new password.",
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <SEO
        title="Sign in to PrintLoco"
        description="Sign in or create your PrintLoco account to order 3D prints, laser cutting, embroidery, CNC, and vinyl — or list your own machine."
        path="/auth"
        noindex
      />
      <div className="container flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
          <div className="mb-8 flex justify-center"><Logo /></div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{titleMap[mode]}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitleMap[mode]}</p>

          {mode === "otp" ? (
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setOtpSent(false); }}
                  required
                />
              </div>
              {!otpSent ? (
                <Button type="button" variant="hero" size="lg" className="w-full" disabled={submitting} onClick={sendOtp}>
                  {submitting ? "Sending…" : "Send code"}
                </Button>
              ) : (
                <>
                  <div>
                    <Label>Enter 6-digit code</Label>
                    <div className="mt-2 flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button type="button" variant="hero" size="lg" className="w-full" disabled={submitting || otp.length !== 6} onClick={verifyOtp}>
                    {submitting ? "Verifying…" : "Verify & sign in"}
                  </Button>
                  <button type="button" onClick={sendOtp} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
                    Resend code
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {(["customer", "maker"] as const).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        className={`rounded-2xl border p-3 text-left text-sm transition-all ${
                          role === r
                            ? "border-primary bg-primary/5 shadow-soft"
                            : "border-border hover:border-foreground/30"
                        }`}
                      >
                        <div className="font-semibold">{r === "maker" ? "I have a machine" : "I want something made"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r === "maker"
                            ? "3D printer, laser, embroidery, CNC or vinyl"
                            : "Order prints, cuts, patches & more"}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              )}
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting
                  ? "Please wait…"
                  : mode === "signup"
                  ? "Create account"
                  : mode === "signin"
                  ? "Sign in"
                  : "Send reset link"}
              </Button>
            </form>
          )}

          {mode !== "forgot" && mode !== "otp" && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => { setMode("otp"); setOtpSent(false); setOtp(""); }}
                className="w-full rounded-2xl border border-border py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Sign in with email code instead
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <>
                Remembered it?{" "}
                <button onClick={() => setMode("signin")} className="font-semibold text-primary hover:underline">
                  Back to sign in
                </button>
              </>
            ) : mode === "otp" ? (
              <>
                Prefer a password?{" "}
                <button onClick={() => setMode("signin")} className="font-semibold text-primary hover:underline">
                  Sign in with password
                </button>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="font-semibold text-primary hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button onClick={() => setMode("signup")} className="font-semibold text-primary hover:underline">
                  Create account
                </button>
              </>
            )}
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
