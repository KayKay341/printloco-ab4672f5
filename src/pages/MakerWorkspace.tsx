import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  Inbox,
  DollarSign,
  Settings as SettingsIcon,
  Sparkles,
  Plus,
  Star,
  TrendingUp,
  ShieldCheck,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Printer as PrinterIcon,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import MakerOrders from "@/components/MakerOrders";
import TierBadge from "@/components/TierBadge";
import { tierFromScore, type Tier } from "@/lib/tier";

type PrinterRow = {
  id: string;
  brand: string;
  model: string;
  materials: string[];
  price_per_gram: number;
  neighborhood: string | null;
  bio: string | null;
  verification_status: string;
  quality_score: number;
  tier: Tier;
  avg_rating: number;
  rating_count: number;
  total_orders: number;
  successful_orders: number;
  last_order_at: string | null;
  published: boolean;
  hidden_for_inactivity: boolean;
  image_url: string | null;
  sample_print_urls: string[] | null;
  has_ams: boolean;
  material_prices: Record<string, number> | null;
};

type OrderStat = { status: string; amount_total: number; created_at: string };

type Section = "overview" | "orders" | "listings" | "earnings" | "settings";

const NAV: { id: Section; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: Inbox },
  { id: "listings", label: "Listings", icon: Package },
  { id: "earnings", label: "Earnings", icon: DollarSign },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const MakerWorkspace = () => {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const sectionParam = (params.get("tab") as Section) || "overview";
  const [section, setSection] = useState<Section>(sectionParam);

  useEffect(() => {
    if (section !== sectionParam) setParams({ tab: section }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStat[]>([]);
  const [pLoading, setPLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setPLoading(true);
      const { data } = await supabase
        .from("printers")
        .select(
          "id, brand, model, materials, price_per_gram, material_prices, neighborhood, bio, verification_status, quality_score, tier, avg_rating, rating_count, total_orders, successful_orders, last_order_at, published, hidden_for_inactivity, image_url, sample_print_urls, has_ams"
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setPrinters((data as unknown as PrinterRow[]) ?? []);

      const { data: oData } = await supabase
        .from("orders")
        .select("status, amount_total, created_at")
        .eq("maker_id", user.id);
      setOrderStats((oData as OrderStat[]) ?? []);
      setPLoading(false);
    })();
  }, [user]);

  const totals = useMemo(() => {
    const earned = orderStats
      .filter((o) => ["completed", "ready", "printing", "accepted"].includes(o.status))
      .reduce((s, o) => s + (o.amount_total ?? 0), 0);
    const pending = orderStats.filter((o) => o.status === "pending").length;
    const inProgress = orderStats.filter((o) =>
      ["accepted", "printing"].includes(o.status)
    ).length;
    const completed = orderStats.filter((o) => o.status === "completed").length;
    return { earned, pending, inProgress, completed };
  }, [orderStats]);

  const avgRating =
    printers.filter((p) => p.rating_count > 0).reduce(
      (s, p, _, a) => s + p.avg_rating / a.length,
      0
    ) || 0;

  if (loading) return <div className="container py-24">Loading…</div>;
  if (!user) return <Navigate to="/auth?mode=signin" replace />;
  if (!profile || !profile.role) return <Navigate to="/onboarding/role" replace />;
  if (profile.role !== "maker") return <Navigate to="/dashboard" replace />;
  if (!pLoading && printers.length === 0)
    return <Navigate to="/onboarding/maker" replace />;

  return (
    <SidebarProvider>
      <SEO
        title="Maker Workspace | PrintLoco"
        description="Run your print shop — orders, listings, earnings, and settings."
        path="/maker"
        noindex
      />
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <PrinterIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-semibold">Maker HQ</div>
                <div className="truncate text-xs text-muted-foreground">
                  {profile.full_name || "Your shop"}
                </div>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((n) => (
                    <SidebarMenuItem key={n.id}>
                      <SidebarMenuButton
                        isActive={section === n.id}
                        onClick={() => setSection(n.id)}
                        tooltip={n.label}
                      >
                        <n.icon className="h-4 w-4" />
                        <span>{n.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Quick links</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Add printer">
                      <Link to="/printers/new">
                        <Plus className="h-4 w-4" />
                        <span>Add printer</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Public listings">
                      <Link to="/printers">
                        <ExternalLink className="h-4 w-4" />
                        <span>Browse marketplace</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Home">
                      <Link to="/">
                        <Home className="h-4 w-4" />
                        <span>Home</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => signOut()} tooltip="Sign out">
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Maker workspace
              </div>
              <div className="truncate font-display text-lg font-semibold">
                {NAV.find((n) => n.id === section)?.label}
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {printers.length} printer{printers.length === 1 ? "" : "s"}
            </Badge>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {section === "overview" && (
              <OverviewSection
                profile={profile}
                printers={printers}
                totals={totals}
                avgRating={avgRating}
                onJump={setSection}
              />
            )}
            {section === "orders" && (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">
                  New jobs from customers stream in here in real time.
                </p>
                <MakerOrders userId={user.id} />
              </div>
            )}
            {section === "listings" && (
              <ListingsSection printers={printers} setPrinters={setPrinters} />
            )}
            {section === "earnings" && (
              <EarningsSection totals={totals} stats={orderStats} printers={printers} />
            )}
            {section === "settings" && (
              <SettingsSection profile={profile} onSaved={refreshProfile} userId={user.id} />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

/* ---------- Overview ---------- */
const StatCard = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
  </div>
);

const OverviewSection = ({
  profile,
  printers,
  totals,
  avgRating,
  onJump,
}: {
  profile: any;
  printers: PrinterRow[];
  totals: { earned: number; pending: number; inProgress: number; completed: number };
  avgRating: number;
  onJump: (s: Section) => void;
}) => {
  const first = profile?.full_name?.split(" ")[0] ?? "there";
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          Welcome back, {first} 👋
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Here's what's happening across your shop today.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Inbox className="h-4 w-4" />}
          label="New orders"
          value={String(totals.pending)}
          hint="Awaiting your action"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="In progress"
          value={String(totals.inProgress)}
          hint="Accepted or printing"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Revenue"
          value={`$${(totals.earned / 100).toFixed(0)}`}
          hint={`${totals.completed} completed`}
        />
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="Rating"
          value={avgRating > 0 ? avgRating.toFixed(1) : "—"}
          hint={`${printers.reduce((s, p) => s + p.rating_count, 0)} reviews`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <button
          onClick={() => onJump("orders")}
          className="group rounded-2xl border border-border bg-card p-6 text-left shadow-soft transition-all hover:border-primary hover:shadow-md"
        >
          <Inbox className="h-6 w-6 text-primary" />
          <div className="mt-3 font-display text-xl font-semibold">Review your orders</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Accept jobs, download STL files, message customers, and mark them ready for pickup.
          </p>
          <div className="mt-3 text-sm font-semibold text-primary">Open orders →</div>
        </button>
        <button
          onClick={() => onJump("listings")}
          className="group rounded-2xl border border-border bg-card p-6 text-left shadow-soft transition-all hover:border-primary hover:shadow-md"
        >
          <Sparkles className="h-6 w-6 text-accent" />
          <div className="mt-3 font-display text-xl font-semibold">Optimize your listings</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Higher quality scores rank you above the competition. Tweak pricing, photos, and AMS to win more jobs.
          </p>
          <div className="mt-3 text-sm font-semibold text-primary">Optimize now →</div>
        </button>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Your printers</h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/printers/new"><Plus className="h-4 w-4 mr-1" /> Add</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {printers.slice(0, 6).map((p) => {
            const tier = (p.tier as Tier) ?? tierFromScore(p.quality_score ?? 50);
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.neighborhood || "—"}
                  </div>
                  <TierBadge tier={tier} score={p.quality_score} showScore />
                </div>
                <div className="mt-1 font-display text-lg font-semibold">
                  {p.brand} {p.model}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {p.published ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertCircle className="h-3 w-3" /> Draft
                    </span>
                  )}
                  · {p.total_orders} jobs · ${Number(p.price_per_gram).toFixed(2)}/g
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------- Listings ---------- */
const ListingsSection = ({
  printers,
  setPrinters,
}: {
  printers: PrinterRow[];
  setPrinters: (p: PrinterRow[]) => void;
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ price_per_gram: string; material_prices: Record<string, string> }>({
    price_per_gram: "",
    material_prices: {},
  });
  const [saving, setSaving] = useState(false);

  const togglePublished = async (id: string, next: boolean) => {
    const { error } = await supabase.from("printers").update({ published: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPrinters(printers.map((p) => (p.id === id ? { ...p, published: next } : p)));
    toast.success(next ? "Listing is live" : "Listing hidden");
  };

  const startEdit = (p: PrinterRow) => {
    setEditingId(p.id);
    const mp: Record<string, string> = {};
    for (const m of p.materials || []) {
      const v = p.material_prices?.[m];
      mp[m] = v != null ? String(v) : "";
    }
    setDraft({ price_per_gram: String(p.price_per_gram ?? ""), material_prices: mp });
  };

  const savePricing = async (p: PrinterRow) => {
    const base = parseFloat(draft.price_per_gram);
    if (!Number.isFinite(base) || base < 0 || base > 5) {
      toast.error("Base price per gram must be between $0 and $5.");
      return;
    }
    const cleanedMaterialPrices: Record<string, number> = {};
    for (const [m, raw] of Object.entries(draft.material_prices)) {
      if (raw === "" || raw == null) continue;
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v < 0 || v > 5) {
        toast.error(`Price for ${m} must be between $0 and $5.`);
        return;
      }
      cleanedMaterialPrices[m] = v;
    }
    setSaving(true);
    const { error } = await supabase
      .from("printers")
      .update({ price_per_gram: base, material_prices: cleanedMaterialPrices })
      .eq("id", p.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPrinters(
      printers.map((row) =>
        row.id === p.id
          ? { ...row, price_per_gram: base, material_prices: cleanedMaterialPrices }
          : row
      )
    );
    setEditingId(null);
    toast.success("Pricing updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Toggle listings live, fine-tune them, and watch your quality score climb.
        </p>
        <Button asChild variant="hero">
          <Link to="/printers/new"><Plus className="h-4 w-4 mr-1" /> Add printer</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {printers.map((p) => {
          const tier = (p.tier as Tier) ?? tierFromScore(p.quality_score ?? 50);
          const tips: string[] = [];
          if (p.verification_status !== "verified") tips.push("Verify your printer to unlock the verified badge.");
          if (!p.sample_print_urls || p.sample_print_urls.length < 3)
            tips.push("Add 3+ sample print photos to boost trust.");
          if (!p.bio || p.bio.length < 60) tips.push("Write a 1–2 sentence bio describing your shop.");
          if (!p.has_ams) tips.push("Enable AMS for multi-color jobs to attract more customers.");
          if (Number(p.price_per_gram) > 0.4) tips.push("Your price per gram is high — consider $0.20–$0.30 to stay competitive.");

          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <TierBadge tier={tier} score={p.quality_score} showScore />
                    {p.published ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Live</Badge>
                    ) : (
                      <Badge variant="secondary">Hidden</Badge>
                    )}
                  </div>
                  <div className="mt-2 font-display text-xl font-semibold truncate">
                    {p.brand} {p.model}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {p.neighborhood || "Add a neighborhood"} · ${Number(p.price_per_gram).toFixed(2)}/g · {p.total_orders} jobs · {p.avg_rating > 0 ? `${p.avg_rating.toFixed(1)}★` : "no ratings yet"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Published</span>
                    <Switch
                      checked={p.published}
                      onCheckedChange={(v) => togglePublished(p.id, v)}
                    />
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/printers?focus=${p.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View public
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                  <Sparkles className="h-3.5 w-3.5" /> Optimization tips
                </div>
                {tips.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    🎉 Your listing is fully optimized. Keep delivering on time to climb the rankings.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-foreground">
                    {tips.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="text-accent">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- Earnings ---------- */
const EarningsSection = ({
  totals,
  stats,
  printers,
}: {
  totals: { earned: number; pending: number; inProgress: number; completed: number };
  stats: OrderStat[];
  printers: PrinterRow[];
}) => {
  const fee = Math.round(totals.earned * 0.1);
  const payout = totals.earned - fee;
  const recent = [...stats]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Gross revenue"
          value={`$${(totals.earned / 100).toFixed(2)}`}
        />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Platform fee (10%)"
          value={`-$${(fee / 100).toFixed(2)}`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Estimated payout"
          value={`$${(payout / 100).toFixed(2)}`}
          hint="Paid via Stripe Connect"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">Recent activity</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium capitalize">{s.status}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="font-semibold">${(s.amount_total / 100).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Settings ---------- */
const SettingsSection = ({
  profile,
  userId,
  onSaved,
}: {
  profile: any;
  userId: string;
  onSaved: () => Promise<void> | void;
}) => {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? "");
  const [zip, setZip] = useState(profile?.zip_code ?? "");
  const [contactEmail, setContactEmail] = useState(profile?.contact_email ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        neighborhood,
        zip_code: zip,
        contact_email: contactEmail,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    await onSaved();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Shop profile</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This info appears to customers when they browse printers.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ph">Phone</Label>
            <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
          </div>
          <div>
            <Label htmlFor="nb">Neighborhood</Label>
            <Input id="nb" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="zip">ZIP code</Label>
            <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ce">Contact email</Label>
            <Input id="ce" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
        </div>
        <Button className="mt-5" onClick={save} disabled={saving} variant="hero">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Payouts</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your Stripe Connect account, tax info, and bank details.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/onboarding/financials">Open payout settings</Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Verification</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified makers rank higher and get the trusted badge.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/onboarding/review">Resume verification</Link>
        </Button>
      </div>
    </div>
  );
};

export default MakerWorkspace;
