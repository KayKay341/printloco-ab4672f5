import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  User, 
  Wrench,
  ChevronDown,
} from "lucide-react";
import Logo from "@/components/site/Logo";
import SEO from "@/components/SEO";
import { SERVICES, type ServiceId } from "@/lib/services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Mode = "signup" | "signin" | "otp" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, refreshProfile } = useAuth();
  const initialMode = (params.get("mode") as Mode) === "signin" ? "signin" : "signup";
  const initialRole = params.get("role") === "maker" ? "maker" : "customer";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<"customer" | "maker">(initialRole);
  const [machines, setMachines] = useState<ServiceId[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleOnboarding, setGoogleOnboarding] = useState(false);

  // Sync profile after Google login if machines were pending
  useEffect(() => {
    const syncPendingMakers = async () => {
      if (user) {
        const pending = localStorage.getItem("pending_maker_onboarding");
        if (pending) {
          try {
            const { role: pRole, machines: pMachines } = JSON.parse(pending);
            const { error } = await supabase
              .from("profiles")
              .update({ role: pRole, machines: pMachines })
              .eq("id", user.id);
            
            if (!error) {
              localStorage.removeItem("pending_maker_onboarding");
              await refreshProfile();
            }
          } catch (e) {
            console.error("Failed to sync pending maker", e);
          }
        }
        
        // Final redirect
        const target = params.get("redirect") || "/dashboard";
        navigate(target, { replace: true });
      }
    };
    syncPendingMakers();
  }, [user, refreshProfile, navigate, params]);

  useEffect(() => {
    // Catch Supabase errors from the URL (like otp_expired)
    const hash = window.location.hash;
    if (hash && hash.includes("error=")) {
      const errorParams = new URLSearchParams(hash.replace("#", "?"));
      const errorMsg = errorParams.get("error_description");
      const errorCode = errorParams.get("error_code");
      
      if (errorMsg) {
        let finalMsg = errorMsg.replace(/\+/g, " ");
        if (errorCode === "otp_expired") {
          finalMsg = "This login link has expired. Magic links only work once and expire quickly. Please request a new one.";
        }
        toast.error(finalMsg, { duration: 6000 });
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  const getPasswordReasons = (pass: string) => {
    if (!pass) return [];
    const reasons = [];
    if (pass.length < 8) reasons.push("at least 8 characters");
    if (!/[A-Z]/.test(pass)) reasons.push("an uppercase letter");
    if (!/[a-z]/.test(pass)) reasons.push("a lowercase letter");
    if (!/[0-9]/.test(pass)) reasons.push("a number");
    if (!/[!@#$%^&*]/.test(pass)) reasons.push("a special character (!@#$%^&*)");
    return reasons;
  };

  const passwordReasons = getPasswordReasons(password);
  const isPasswordStrong = passwordReasons.length === 0;

  const toggleMachine = (id: ServiceId) =>
    setMachines((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !isPasswordStrong) {
      toast.error("Please choose a stronger password.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        if (role === "maker" && machines.length === 0) {
          toast.error("Pick at least one machine you can run.");
          setSubmitting(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${params.get("redirect") || "/dashboard"}`,
            data: { 
              full_name: fullName, 
              role, 
              machines: role === "maker" ? machines : []
            },
          },
        });
        if (error) throw error;
        setEmailSent(true);
        toast.success("Welcome to PrintLoco! Please check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setEmailSent(true);
        toast.success("Password reset link sent. Check your email.");
      }
    } catch (err: any) {
      if (err.message?.includes("too easy to guess")) {
        toast.error("Password is too common or has been leaked in a data breach. Please try a more unique combination.");
      } else {
        toast.error(err.message ?? "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Intercept for maker onboarding
    if (role === "maker" && machines.length === 0 && !googleOnboarding) {
      setGoogleOnboarding(true);
      return;
    }

    if (role === "maker" && machines.length > 0) {
      localStorage.setItem("pending_maker_onboarding", JSON.stringify({ role, machines }));
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${params.get("redirect") || "/dashboard"}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to connect to Google");
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
        options: { 
          shouldCreateUser: true, 
          emailRedirectTo: `${window.location.origin}/dashboard` 
        },
      });
      if (error) throw error;
      setEmailSent(true);
      toast.success("Check your email! We sent a secure link to sign in.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send email");
    } finally {
      setSubmitting(false);
    }
  };

  const titleMap: Record<Mode, string> = {
    signup: "Join PrintLoco",
    signin: "Welcome back",
    otp: "Sign in with email",
    forgot: "Reset password",
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] selection:bg-primary/10">
      <SEO
        title={`${titleMap[mode]} | PrintLoco`}
        description="Sign in or create your PrintLoco account to order 3D prints, laser cutting, embroidery, and vinyl — or list your own machine."
        path="/auth"
        noindex
      />
      
      <div className="flex min-h-screen">
        {/* Left Side: Illustration / Branding */}
        <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
          
          <div className="relative z-10 max-w-lg px-12 text-white">
            <Logo className="mb-12 h-10 brightness-0 invert" />
            <h2 className="text-4xl font-display font-bold leading-tight tracking-tight">
              {mode === "signup" ? "Build your neighborhood manufacturing network." : "Good to see you again."}
            </h2>
            <p className="mt-6 text-lg text-slate-300">
              PrintLoco connects local makers with people who want to bring their ideas to life. High quality, zero shipping, real community.
            </p>
            
            <div className="mt-12 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-white">Instant quotes</div>
                  <div className="text-sm text-slate-400">Upload your file and get a price in seconds.</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-white">Secure transactions</div>
                  <div className="text-sm text-slate-400">Escrow payments mean you only pay when you're happy.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[400px]">
            <div className="lg:hidden mb-8 flex justify-center"><Logo /></div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={mode + (emailSent ? "-sent" : "") + (googleOnboarding ? "-onboard" : "")}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {googleOnboarding ? (
                  <div className="space-y-6">
                    <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">Finish your maker profile</h1>
                    <p className="mt-2 text-slate-500">Pick the machines you have so we can match you with local orders.</p>
                    
                    <div className="space-y-4">
                      <Label className="text-slate-700 font-medium">Select your capabilities</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between h-12 rounded-xl text-left font-semibold">
                            {machines.length > 0 
                              ? `${machines.length} services selected` 
                              : "Choose your machines..."}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[350px] rounded-xl p-2" align="start">
                          <DropdownMenuLabel>Manufacturing Services</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {SERVICES.map((s) => (
                            <DropdownMenuCheckboxItem
                              key={s.id}
                              checked={machines.includes(s.id)}
                              onCheckedChange={() => toggleMachine(s.id)}
                              className="rounded-lg py-3"
                            >
                              <div className="flex items-center gap-3">
                                <s.icon className="h-4 w-4 text-primary" />
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{s.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{s.tagline}</span>
                                </div>
                              </div>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button 
                        className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20" 
                        variant="hero"
                        onClick={handleGoogleSignIn}
                        disabled={machines.length === 0}
                      >
                        Continue with Google
                      </Button>
                      <button 
                        onClick={() => setGoogleOnboarding(false)} 
                        className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                ) : emailSent ? (
                  <div className="mt-8 space-y-6">
                    <div className="rounded-2xl bg-primary/5 p-6 border border-primary/10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                        <Mail className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Email sent to {email}</h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        We've sent a secure link to your email. Click the link to complete your {mode === "signup" ? "registration" : mode === "forgot" ? "password reset" : "sign in"}.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="lg" 
                        className="w-full h-12 rounded-xl text-base font-semibold" 
                        onClick={() => setEmailSent(false)}
                      >
                        Try a different email
                      </Button>
                      
                      <button 
                        type="button" 
                        onClick={mode === "otp" ? sendOtp : handleSubmit} 
                        className="block w-full text-center text-sm font-medium text-primary hover:underline"
                      >
                        Didn't get an email? Resend link
                      </button>
                    </div>

                    <div className="mt-8 p-4 rounded-2xl border border-amber-100 bg-amber-50/50">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-amber-800 uppercase tracking-tight">Check Spam</div>
                          <p className="mt-1 text-xs text-amber-700 leading-normal">
                            If you don't see it within a minute, check your junk folder or make sure you entered the right address.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : mode === "otp" ? (
                  <div className="mt-8 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 font-medium">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); }}
                          placeholder="name@example.com"
                          className="pl-10 h-11 rounded-xl"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>
                    
                    <Button type="button" variant="hero" size="lg" className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20" disabled={submitting} onClick={sendOtp}>
                      {submitting ? "Sending link…" : "Send Magic Link"}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {mode === "signup" && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-medium">Account Type</Label>
                          <Select value={role} onValueChange={(v: "customer" | "maker") => setRole(v)}>
                            <SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 font-bold focus:ring-primary/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border">
                              <SelectItem value="customer" className="rounded-lg py-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-primary" />
                                  <div className="flex flex-col">
                                    <span className="font-bold">Order Prints</span>
                                    <span className="text-[10px] text-muted-foreground">I want to get things made</span>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="maker" className="rounded-lg py-3">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4 text-primary" />
                                  <div className="flex flex-col">
                                    <span className="font-bold">Become a Maker</span>
                                    <span className="text-[10px] text-muted-foreground">I have machines and want orders</span>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {role === "maker" && (
                          <div className="space-y-2">
                            <Label className="text-slate-700 font-medium">Your Capabilities</Label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-12 rounded-xl text-left font-semibold border-2 border-slate-100">
                                  {machines.length > 0 
                                    ? `${machines.length} services selected` 
                                    : "Choose your services..."}
                                  <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-[350px] rounded-xl p-2" align="start">
                                <DropdownMenuLabel>Manufacturing Services</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {SERVICES.map((s) => (
                                  <DropdownMenuCheckboxItem
                                    key={s.id}
                                    checked={machines.includes(s.id)}
                                    onCheckedChange={() => toggleMachine(s.id)}
                                    className="rounded-lg py-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      <s.icon className="h-4 w-4 text-primary" />
                                      <div className="flex flex-col">
                                        <span className="font-bold text-sm">{s.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{s.tagline}</span>
                                      </div>
                                    </div>
                                  </DropdownMenuCheckboxItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="text-slate-700 font-medium">Full name</Label>
                          <Input 
                            id="fullName" 
                            name="name"
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            placeholder="Jane Doe" 
                            className="h-11 rounded-xl border-2 border-slate-100 focus:border-primary"
                            autoComplete="name"
                            required 
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 font-medium">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                          id="email" 
                          name="email"
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="name@example.com" 
                          className="pl-10 h-11 rounded-xl border-2 border-slate-100 focus:border-primary"
                          autoComplete="email"
                          required 
                        />
                      </div>
                    </div>

                    {mode !== "forgot" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" name="password" className="text-slate-700 font-medium">Password</Label>
                          {mode === "signin" && (
                            <button
                              type="button"
                              onClick={() => setMode("forgot")}
                              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                              Forgot?
                            </button>
                          )}
                        </div>
                        <Input 
                          id="password" 
                          name="password"
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="••••••••"
                          className="h-11 rounded-xl border-2 border-slate-100 focus:border-primary"
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                          required 
                        />
                        {mode === "signup" && password && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isPasswordStrong ? "text-emerald-600" : "text-amber-600"}`}>
                                {isPasswordStrong ? "Secure Password" : "Improve Security"}
                              </span>
                              {!isPasswordStrong && <span className="text-[10px] text-slate-400">{5 - passwordReasons.length}/5 met</span>}
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                              {[
                                { id: "length", label: "8+ characters", met: !passwordReasons.includes("at least 8 characters") },
                                { id: "upper", label: "Uppercase letter", met: !passwordReasons.includes("an uppercase letter") },
                                { id: "lower", label: "Lowercase letter", met: !passwordReasons.includes("a lowercase letter") },
                                { id: "number", label: "A number", met: !passwordReasons.includes("a number") },
                                { id: "special", label: "Special symbol", met: !passwordReasons.includes("a special character (!@#$%^&*)") }
                              ].map((r) => (
                                <div key={r.id} className={`flex items-center gap-2 text-[11px] ${r.met ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                                  {r.met ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-slate-300" />}
                                  {r.label}
                                </div>
                              ))}
                            </div>
                            {isPasswordStrong && (
                              <p className="mt-2 text-[10px] text-slate-400 italic flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Browsers check if passwords were ever leaked.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <Button type="submit" variant="hero" size="lg" className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20" disabled={submitting}>
                      {submitting ? "Processing…" : mode === "signup" ? "Create Free Account" : mode === "signin" ? "Sign In" : "Send Reset Link"}
                    </Button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>

            {!emailSent && mode !== "forgot" && mode !== "otp" && (
              <div className="mt-8 space-y-3">
                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold"><span className="bg-[#fcfcfd] px-4 text-slate-400">Or</span></div>
                </div>
                
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-3.3 3.28-8.19 3.28-13.09z"
                      fill="#4285F4"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  type="button"
                  onClick={() => { setMode("otp"); setEmailSent(false); }}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Sign in with Magic Link
                </button>
              </div>
            )}

            {!emailSent && (
              <div className="mt-10 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  {mode === "forgot" ? (
                    <button onClick={() => setMode("signin")} className="flex items-center gap-2 mx-auto text-primary hover:underline group">
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to sign in
                    </button>
                  ) : mode === "otp" ? (
                    <button onClick={() => setMode("signin")} className="text-primary hover:underline">
                      Prefer signing in with a password?
                    </button>
                  ) : mode === "signup" ? (
                    <>Already have an account? <button onClick={() => setMode("signin")} className="font-bold text-primary hover:underline">Sign in</button></>
                  ) : (
                    <>New to PrintLoco? <button onClick={() => setMode("signup")} className="font-bold text-primary hover:underline">Create account</button></>
                  )}
                </p>
                
                <Link to="/" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
                  <ArrowLeft className="h-3 w-3" /> Return home
                </Link>
              </div>
            )}
            
            {!emailSent && mode === "otp" && (
              <div className="mt-12 p-4 rounded-2xl border border-blue-100 bg-blue-50/50">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-blue-800 uppercase tracking-tight">Security Tip</div>
                    <p className="mt-1 text-xs text-blue-700 leading-normal">
                      Magic links are a secure, password-less way to sign in. We'll email you a unique link that logs you in instantly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
