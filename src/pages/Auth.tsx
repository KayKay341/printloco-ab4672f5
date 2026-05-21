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
import { lovable } from "@/integrations/lovable";

type Mode = "signup" | "signin" | "otp" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const initialMode = (params.get("mode") as Mode) === "signin" ? "signin" : "signup";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  useEffect(() => {
    if (user) navigate("/onboarding/role", { replace: true });
  }, [user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding/role`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Welcome to PrintLoco!");
          navigate("/onboarding/role", { replace: true });
        } else {
          setAwaitingConfirm(true);
          toast.success("Check your email to confirm your account.");
        }
      } else if (mode === "signin") {

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
        navigate("/onboarding/role", { replace: true });
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
    if (method === 'email' && !email) {
      toast.error("Enter your email first");
      return;
    }
    if (method === 'phone' && !phone) {
      toast.error("Enter your phone number first");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        ...(method === 'email' ? { email } : { phone }),
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/onboarding/role` },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Code sent!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send code");
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/onboarding/role`,
      });
      if (result.error) throw new Error(result.error.message ?? "Google sign-in failed");
      if (result.redirected) return;
      navigate("/onboarding/role", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setSubmitting(true);
    try {
      const params: any = method === 'email'
        ? { email, token: otp, type: 'email' }
        : { phone, token: otp, type: 'sms' };
      const { error } = await supabase.auth.verifyOtp(params);
      if (error) throw error;
      toast.success("Signed in.");
      navigate("/onboarding/role", { replace: true });
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
        description="Sign in or create your PrintLoco account to order 3D prints, laser cutting, embroidery, and vinyl — or list your own machine."
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
              <div className="flex rounded-lg bg-muted p-1">
                <button className={`flex-1 rounded-md py-1.5 text-sm font-medium ${method === 'email' ? 'bg-background shadow-sm' : ''}`} onClick={() => {setMethod('email'); setOtpSent(false);}}>Email</button>
                <button className={`flex-1 rounded-md py-1.5 text-sm font-medium ${method === 'phone' ? 'bg-background shadow-sm' : ''}`} onClick={() => {setMethod('phone'); setOtpSent(false);}}>Phone</button>
              </div>
              <div>
                <Label htmlFor="contact">{method === 'email' ? 'Email' : 'Phone (+1...)'}</Label>
                <Input
                  id="contact"
                  type={method === 'email' ? 'email' : 'tel'}
                  value={method === 'email' ? email : phone}
                  onChange={(e) => { 
                    method === 'email' ? setEmail(e.target.value) : setPhone(e.target.value); 
                    setOtpSent(false); 
                  }}
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
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
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

          {mode !== "forgot" && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.3 35.6 44 30.3 44 24c0-1.3-.1-2.4-.4-3.5z"/>
                </svg>
                Continue with Google
              </button>
            </>
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
