import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldCheck, Mail, Users, Sparkles, Send, Save, Plus, Trash2, CheckCircle2, XCircle, Factory } from "lucide-react";
import { format } from "date-fns";
import { refreshMetrics, type AppMetric } from "@/hooks/useAppMetrics";

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
  const [metrics, setMetrics] = useState<AppMetric[]>([]);
  const [newCity, setNewCity] = useState({ name: "", slug: "", status: "waitlist" as City["status"] });

  const loadAll = async () => {
    const [citiesRes, signupsRes, leadsRes, metricsRes] = await Promise.all([
      supabase.from("cities").select("*").order("signup_count", { ascending: false }),
      supabase.from("waitlist_signups").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("investor_leads").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("app_metrics").select("*").order("key"),
    ]);
    if (citiesRes.data) setCities(citiesRes.data as City[]);
    if (signupsRes.data) setSignups(signupsRes.data as Signup[]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (metricsRes.data) setMetrics(metricsRes.data as AppMetric[]);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  if (authLoading || roleLoading) {
    return <div className="container py-24 text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth?mode=signin" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const updateCity = async (id: string, patch: Partial<City>) => {
    const { error } = await supabase.from("cities").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("City updated");
    loadAll();
  };

  const addCity = async () => {
    const name = newCity.name.trim();
    const slug = (newCity.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
    if (!name || !slug) return toast.error("Name and slug required");
    const { error } = await supabase.from("cities").insert({ name, slug, status: newCity.status });
    if (error) return toast.error(error.message);
    setNewCity({ name: "", slug: "", status: "waitlist" });
    toast.success("City added");
    loadAll();
  };

  const deleteCity = async (id: string) => {
    if (!confirm("Delete this city?")) return;
    const { error } = await supabase.from("cities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("City deleted");
    loadAll();
  };

  const saveMetric = async (m: AppMetric) => {
    const { error } = await supabase
      .from("app_metrics")
      .update({ value_number: m.value_number, value_text: m.value_text })
      .eq("key", m.key);
    if (error) return toast.error(error.message);
    await refreshMetrics();
    toast.success(`Updated ${m.key}`);
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

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin | PrintLoco" description="PrintLoco admin console." path="/admin" noindex />
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

        <Tabs defaultValue="metrics" className="mt-10">
          <TabsList>
            <TabsTrigger value="metrics">Site numbers</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
            <TabsTrigger value="signups">Waitlist</TabsTrigger>
            <TabsTrigger value="leads">Investor leads</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="mt-6">
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold">Editable headline numbers</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                These are the public-facing numbers shown on the homepage, waitlist, and invest pages.
                Numeric fields override the displayed value; text fields override labels like "$0.18" or "10×".
              </p>
              <div className="mt-6 space-y-3">
                {metrics.map((m, idx) => (
                  <div key={m.key} className="grid items-end gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-[1fr_140px_140px_auto]">
                    <div>
                      <Label className="text-xs">{m.key}</Label>
                      <div className="mt-1 text-xs text-muted-foreground">{m.label}</div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Number</Label>
                      <Input
                        type="number"
                        value={m.value_number ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          setMetrics((arr) => arr.map((x, i) => i === idx ? { ...x, value_number: v } : x));
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Display text</Label>
                      <Input
                        value={m.value_text ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : e.target.value;
                          setMetrics((arr) => arr.map((x, i) => i === idx ? { ...x, value_text: v } : x));
                        }}
                      />
                    </div>
                    <Button size="sm" variant="hero" onClick={() => saveMetric(m)}>
                      <Save className="h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cities" className="mt-6 space-y-4">
            <Card className="p-5">
              <h3 className="font-display text-base font-semibold">Add city</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_160px_auto]">
                <Input placeholder="Name (e.g. Brooklyn, NY)" value={newCity.name} onChange={(e) => setNewCity((c) => ({ ...c, name: e.target.value }))} />
                <Input placeholder="slug (e.g. brooklyn)" value={newCity.slug} onChange={(e) => setNewCity((c) => ({ ...c, slug: e.target.value }))} />
                <Select value={newCity.status} onValueChange={(v) => setNewCity((c) => ({ ...c, status: v as City["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waitlist">Waitlist</SelectItem>
                    <SelectItem value="launching">Launching</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addCity}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </div>
            </Card>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Signups</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{c.name}<div className="text-xs text-muted-foreground">{c.slug}</div></td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          defaultValue={c.signup_count}
                          className="h-8 w-24"
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isNaN(n) && n !== c.signup_count) updateCity(c.id, { signup_count: n });
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select value={c.status} onValueChange={(v) => updateCity(c.id, { status: v as City["status"] })}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waitlist">Waitlist</SelectItem>
                            <SelectItem value="launching">Launching</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button size="sm" variant="soft" onClick={() => sendLaunchAnnouncement(c)}>
                          <Send className="h-3.5 w-3.5" /> Announce
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteCity(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
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
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No signups yet.</td></tr>
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
