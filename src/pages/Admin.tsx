import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldCheck, Mail, Users, Sparkles, Send, Crown, KeyRound } from "lucide-react";
import { format } from "date-fns";

type City = {
  id: string;
  name: string;
  slug: string;
  status: "waitlist" | "launching" | "live";
  launch_date: string | null;
  signup_count: number;
};

type Signup = {
  id: string;
  email: string;
  role: string;
  city: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
  referral_code: string | null;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  check_size: string | null;
  message: string | null;
  created_at: string;
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [cities, setCities] = useState<City[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [grantEmail, setGrantEmail] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [anyAdmin, setAnyAdmin] = useState<boolean | null>(null);

  const loadAll = async () => {
    const [citiesRes, signupsRes, leadsRes] = await Promise.all([
      supabase.from("cities").select("*").order("signup_count", { ascending: false }),
      supabase.from("waitlist_signups").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("investor_leads").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (citiesRes.data) setCities(citiesRes.data as City[]);
    if (signupsRes.data) setSignups(signupsRes.data as Signup[]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
  };

  useEffect(() => {
    // Detect whether ANY admin exists, so we can show the bootstrap claim button
    supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .then(({ count }) => setAnyAdmin((count ?? 0) > 0));
  }, []);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  if (authLoading || roleLoading) {
    return <div className="container py-24 text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth?mode=signin" replace />;

  // First-admin claim flow
  if (!isAdmin && anyAdmin === false) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-xl py-24">
          <Card className="p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Crown className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-3xl font-semibold">Claim admin</h1>
            <p className="mt-2 text-muted-foreground">
              No admin has been set up yet. Click below to claim admin for{" "}
              <strong className="text-foreground">{user.email}</strong>.
            </p>
            <Button
              variant="hero"
              size="lg"
              className="mt-6"
              disabled={claiming}
              onClick={async () => {
                setClaiming(true);
                const { data, error } = await supabase.rpc("claim_first_admin");
                setClaiming(false);
                if (error) {
                  toast.error(error.message);
                  return;
                }
                if (data) {
                  toast.success("You're now admin. Welcome.");
                  window.location.reload();
                } else {
                  toast.error("Admin already claimed by another account.");
                  setAnyAdmin(true);
                }
              }}
            >
              <KeyRound className="h-4 w-4" /> Claim admin
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const updateCityStatus = async (id: string, status: City["status"]) => {
    const { error } = await supabase.from("cities").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("City updated");
    loadAll();
  };

  const sendLaunchAnnouncement = async (city: City) => {
    const { data, error } = await supabase.functions.invoke("notify-city-waitlist", {
      body: { citySlug: city.slug },
    });
    if (error) return toast.error(error.message);
    toast.success(
      data?.queued
        ? `Queued ${data.queued} announcement emails for ${city.name}`
        : `Launch announcement triggered for ${city.name}`,
    );
  };

  const grantAdmin = async () => {
    const email = grantEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.functions.invoke("grant-admin-role", { body: { email } });
    if (error) return toast.error(error.message);
    toast.success(`Granted admin to ${email}`);
    setGrantEmail("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-6xl py-12">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Admin console</div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">Run the network</h1>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <KpiCard icon={Users} label="Waitlist signups" value={signups.length.toLocaleString()} />
          <KpiCard icon={Sparkles} label="Cities tracked" value={cities.length.toLocaleString()} />
          <KpiCard icon={Mail} label="Investor leads" value={leads.length.toLocaleString()} />
        </div>

        <Tabs defaultValue="cities" className="mt-10">
          <TabsList>
            <TabsTrigger value="cities">Cities</TabsTrigger>
            <TabsTrigger value="signups">Waitlist</TabsTrigger>
            <TabsTrigger value="leads">Investor leads</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
          </TabsList>

          <TabsContent value="cities" className="mt-6">
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Signups</th>
                    <th className="px-4 py-3">Launch</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.signup_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.launch_date ? format(new Date(c.launch_date), "MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Select value={c.status} onValueChange={(v) => updateCityStatus(c.id, v as City["status"])}>
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waitlist">Waitlist</SelectItem>
                            <SelectItem value="launching">Launching</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="soft" onClick={() => sendLaunchAnnouncement(c)}>
                          <Send className="h-3.5 w-3.5" /> Announce launch
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="signups" className="mt-6">
            <Card className="overflow-hidden">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Zip</th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signups.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{s.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.role}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.city || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.zip_code || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {format(new Date(s.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    ))}
                    {signups.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          No signups yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="mt-6">
            <Card className="overflow-hidden">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Org</th>
                      <th className="px-4 py-3">Check</th>
                      <th className="px-4 py-3">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{l.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.organization || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.check_size || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {format(new Date(l.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="mt-6">
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold">Grant admin role</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Type the email of an existing user. They must have signed up first.
              </p>
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="someone@example.com"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                />
                <Button variant="hero" onClick={grantAdmin}>Grant</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <Card className="flex items-center gap-4 p-5">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-semibold">{value}</div>
    </div>
  </Card>
);

export default Admin;
