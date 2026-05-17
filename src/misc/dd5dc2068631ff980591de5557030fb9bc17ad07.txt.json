import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Plus, Upload, Printer, FileBox, Sparkles, ShieldCheck, Star, AlertCircle, TrendingUp, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { getSamplePrinters, getSampleStlFiles } from "@/lib/sampleData";
import TierBadge from "@/components/TierBadge";
import DisputeDialog from "@/components/DisputeDialog";
import MakerOrders from "@/components/MakerOrders";
import { tierFromScore, type Tier } from "@/lib/tier";

type PrinterRow = {
  id: string;
  brand: string;
  model: string;
  materials: string[];
  price_per_gram: number;
  neighborhood: string | null;
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
};

type StlRow = {
  id: string;
  file_name: string;
  material: string;
  estimated_weight: number | null;
  estimated_price: number | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  status: string;
  amount_total: number;
  material: string;
  created_at: string;
  maker_id: string;
  printer_id: string | null;
  printers: { brand: string; model: string } | null;
};

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { isDemo, demoOrders, demoPrinters, resetDemo } = useDemoMode();
  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [files, setFiles] = useState<StlRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [usingSample, setUsingSample] = useState(false);
  const [disputeOrder, setDisputeOrder] = useState<{ id: string; maker_id: string } | null>(null);
  
  // Profile settings state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    address_line1: (profile as any)?.address_line1 || "",
    address_line2: (profile as any)?.address_line2 || "",
    city: (profile as any)?.city || "",
    state: (profile as any)?.state || "",
    zip_code: profile?.zip_code || "",
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address_line1: (profile as any).address_line1 || "",
        address_line2: (profile as any).address_line2 || "",
        city: (profile as any).city || "",
        state: (profile as any).state || "",
        zip_code: profile.zip_code || "",
      });
    }
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", user.id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated");
      setEditingProfile(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (profile?.role === "maker") {
      supabase
        .from("printers")
        .select("id, brand, model, materials, price_per_gram, neighborhood, verification_status, quality_score, tier, avg_rating, rating_count, total_orders, successful_orders, last_order_at, published, hidden_for_inactivity")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) toast.error(error.message);
          const real = (data as unknown as PrinterRow[]) ?? [];
          if (real.length === 0 && isDemo) {
            const samples = getSamplePrinters(24).slice(0, 3).map((s) => ({
              id: s.id,
              brand: s.brand,
              model: s.model,
              materials: s.materials,
              price_per_gram: s.price_per_gram,
              neighborhood: s.neighborhood,
              verification_status: s.verification_status,
              quality_score: s.quality_score,
              tier: s.tier as Tier,
              avg_rating: s.avg_rating,
              rating_count: s.rating_count,
              total_orders: s.total_orders,
              successful_orders: s.successful_orders,
              last_order_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
              published: true,
              hidden_for_inactivity: false,
            }));
            setPrinters(samples);
            setUsingSample(true);
          } else {
            setPrinters(real);
            setUsingSample(false);
          }
        });
    } else {
      supabase
        .from("stl_files")
        .select("id, file_name, material, estimated_weight, estimated_price, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) toast.error(error.message);
          const real = (data as StlRow[]) ?? [];
          if (real.length === 0 && isDemo) {
            setFiles(getSampleStlFiles());
            setUsingSample(true);
          } else {
            setFiles(real);
            setUsingSample(false);
          }
        });

      // Recent orders so customers can rate / dispute
      supabase
        .from("orders")
        .select("id, status, amount_total, material, created_at, maker_id, printer_id, printers(brand, model)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => setOrders((data as unknown as OrderRow[]) ?? []));
    }
  }, [user, profile?.role, isDemo]);

  if (loading) return <div className="container py-24">Loading…</div>;
  if (!user) return <Navigate to="/auth?mode=signin" replace />;

  // Maker rollups
  const totalEarningsCents = printers.reduce((sum, p) => sum + Math.round((p.successful_orders || 0) * (Number(p.price_per_gram) || 0) * 38 * 0.9 * 100), 0);
  const totalOrders = printers.reduce((acc, p) => acc + (p.total_orders || 0), 0);
  const totalSuccessful = printers.reduce((acc, p) => acc + (p.successful_orders || 0), 0);
  const successRate = totalOrders > 0
    ? Math.round((totalSuccessful / totalOrders) * 100)
    : null;
  const printersWithRatings = printers.filter((p) => (p.rating_count || 0) > 0);
  const avgRating = printersWithRatings.length > 0 
    ? printersWithRatings.reduce((sum, p) => sum + (p.avg_rating || 0), 0) / printersWithRatings.length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Dashboard | PrintLoco" description="Manage your PrintLoco orders, prints, and listings." path="/dashboard" noindex />
      <Navbar />
      <main className="container py-12">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {profile?.role === "maker" ? "Maker Dashboard" : "Customer Dashboard"}
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
          </h1>
          {usingSample && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent">
              <Sparkles className="h-3 w-3" />
              Sample data — your real {profile?.role === "maker" ? "printers" : "uploads"} appear here once you add them.
            </div>
          )}
        </div>

        {profile?.role === "maker" ? (
          <section>
            {/* Quality + earnings rollup */}
            {printers.length > 0 && (
              <div className="mb-8 grid gap-3 sm:grid-cols-3">
                <StatCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Earned this season"
                  value={`$${(totalEarningsCents / 100).toFixed(0)}`}
                  hint="After platform fee"
                />
                <StatCard
                  icon={<Star className="h-4 w-4" />}
                  label="Average rating"
                  value={avgRating > 0 ? avgRating.toFixed(1) : "—"}
                  hint={`${printers.reduce((s, p) => s + p.rating_count, 0)} ratings`}
                />
                <StatCard
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="On-time success"
                  value={successRate != null ? `${successRate}%` : "—"}
                  hint="Aim for 95%+"
                />
              </div>
            )}

            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Your printers</h2>
              <Button variant="hero" asChild>
                <Link to="/printers/new"><Plus className="h-4 w-4" /> Add printer</Link>
              </Button>
            </div>
            {printers.length === 0 ? (
              <EmptyState
                icon={<Printer className="h-8 w-8" />}
                title="No printers listed yet"
                desc="Add your first printer to start accepting orders."
                cta={<Button variant="hero" asChild><Link to="/printers/new">Add your first printer</Link></Button>}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {printers.map((p) => {
                  const tier: Tier = (p.tier as Tier) ?? tierFromScore(p.quality_score ?? 50);
                  const inactive = p.hidden_for_inactivity || (p.last_order_at && Date.now() - new Date(p.last_order_at).getTime() > 1000 * 60 * 60 * 24 * 30);
                  const needsVerification = p.verification_status !== "verified";
                  return (
                    <div key={p.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                      <div className="flex items-start justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.neighborhood || "—"}</div>
                        <TierBadge tier={tier} score={p.quality_score} showScore />
                      </div>
                      <div className="mt-1 font-display text-xl font-semibold">{p.brand} {p.model}</div>

                      {/* Quality progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Quality score</span>
                          <span className="font-semibold text-foreground">{p.quality_score}/100</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary transition-all" style={{ width: `${p.quality_score}%` }} />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.materials.map((m) => (
                          <span key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{m}</span>
                        ))}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <div className="font-semibold text-foreground">{p.total_orders}</div>
                          <div>orders</div>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {p.rating_count > 0 ? `${Number(p.avg_rating).toFixed(1)} ★` : "—"}
                          </div>
                          <div>{p.rating_count} ratings</div>
                        </div>
                      </div>

                      {/* Honest feedback to maker */}
                      {(needsVerification || inactive || p.quality_score < 60) && (
                        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-accent">
                            <AlertCircle className="h-3.5 w-3.5" /> How to rank higher
                          </div>
                          <ul className="mt-1 space-y-0.5 pl-1 text-muted-foreground">
                            {needsVerification && <li>• Finish verification (printer photo + 3 sample prints)</li>}
                            {p.quality_score < 60 && <li>• Add more sample prints and material spec sheets</li>}
                            {inactive && <li>• Accept an order this month so we keep showing you</li>}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 text-sm text-muted-foreground">
                        From <strong className="text-foreground">${Number(p.price_per_gram).toFixed(2)}</strong> / gram
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Incoming orders for makers */}
            <div className="mt-12">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-display text-2xl font-semibold">Incoming orders</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <FileBox className="h-3 w-3" /> STL & 3MF files included
                </span>
              </div>
              <MakerOrders userId={user.id} />
            </div>
          </section>
        ) : (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Your uploads & quotes</h2>
              <div className="flex gap-2">
                <Button variant="soft" asChild><Link to="/printers">Browse printers</Link></Button>
                <Button variant="hero" asChild><Link to="/upload"><Upload className="h-4 w-4" /> Upload STL</Link></Button>
              </div>
            </div>
            {files.length === 0 ? (
              <EmptyState
                icon={<FileBox className="h-8 w-8" />}
                title="No uploads yet"
                desc="Upload an STL file to get an instant quote."
                cta={<Button variant="hero" asChild><Link to="/upload">Upload your first STL</Link></Button>}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4">File</th>
                      <th className="p-4">Material</th>
                      <th className="p-4">Weight</th>
                      <th className="p-4">Quote</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id} className="border-t border-border">
                        <td className="p-4 font-medium">{f.file_name}</td>
                        <td className="p-4">{f.material}</td>
                        <td className="p-4">{f.estimated_weight ? `${f.estimated_weight}g` : "—"}</td>
                        <td className="p-4 font-semibold">{f.estimated_price ? `$${Number(f.estimated_price).toFixed(2)}` : "—"}</td>
                        <td className="p-4 text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Profile / Delivery Settings */}
            <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-foreground">Delivery profile</h2>
                  <p className="text-sm text-muted-foreground">Keep your address updated for smooth home delivery from local makers.</p>
                </div>
                <Button 
                  variant={editingProfile ? "hero" : "outline"} 
                  onClick={() => editingProfile ? saveProfile() : setEditingProfile(true)}
                >
                  {editingProfile ? "Save changes" : "Edit profile"}
                </Button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <Input 
                    value={profileData.full_name} 
                    onChange={(e) => setProfileData(d => ({ ...d, full_name: e.target.value }))}
                    disabled={!editingProfile}
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone</label>
                  <Input 
                    value={profileData.phone} 
                    onChange={(e) => setProfileData(d => ({ ...d, phone: e.target.value }))}
                    disabled={!editingProfile}
                    placeholder="+1 (555) 000-0000"
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Address Line 1</label>
                  <Input 
                    value={profileData.address_line1} 
                    onChange={(e) => setProfileData(d => ({ ...d, address_line1: e.target.value }))}
                    disabled={!editingProfile}
                    placeholder="123 Printing Way"
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Address Line 2 (Optional)</label>
                  <Input 
                    value={profileData.address_line2} 
                    onChange={(e) => setProfileData(d => ({ ...d, address_line2: e.target.value }))}
                    disabled={!editingProfile}
                    placeholder="Apt 4B"
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">City</label>
                  <Input 
                    value={profileData.city} 
                    onChange={(e) => setProfileData(d => ({ ...d, city: e.target.value }))}
                    disabled={!editingProfile}
                    className="bg-muted/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">State</label>
                    <Input 
                      value={profileData.state} 
                      onChange={(e) => setProfileData(d => ({ ...d, state: e.target.value }))}
                      disabled={!editingProfile}
                      placeholder="CA"
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ZIP Code</label>
                    <Input 
                      value={profileData.zip_code} 
                      onChange={(e) => setProfileData(d => ({ ...d, zip_code: e.target.value }))}
                      disabled={!editingProfile}
                      className="bg-muted/30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent orders with reprint guarantee + dispute access */}
            {orders.length > 0 && (
              <div className="mt-10">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold">Recent orders</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <ShieldCheck className="h-3 w-3" /> 7-day reprint guarantee
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-4">Printer</th>
                        <th className="p-4">Material</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Total</th>
                        <th className="p-4 text-right">Issue?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-t border-border">
                          <td className="p-4 font-medium">
                            {o.printers ? `${o.printers.brand} ${o.printers.model}` : "—"}
                          </td>
                          <td className="p-4">{o.material}</td>
                          <td className="p-4 text-muted-foreground capitalize">{o.status}</td>
                          <td className="p-4 font-semibold">${(o.amount_total / 100).toFixed(2)}</td>
                          <td className="p-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDisputeOrder({ id: o.id, maker_id: o.maker_id })}
                            >
                              <ShieldAlert className="h-3.5 w-3.5" /> Report
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Demo orders — live status that auto-advances */}
        {isDemo && demoOrders.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-display text-2xl font-semibold">Demo orders</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                <Sparkles className="h-3 w-3" /> Live simulation
              </span>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={resetDemo}>
                Reset demo
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {demoOrders.map((o) => (
                <article key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {o.printerLabel}
                      </div>
                      <div className="mt-0.5 truncate font-display text-base font-semibold">
                        {o.fileName ?? "Custom order"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.material}{o.colorName ? ` · ${o.colorName}` : ""} · {o.weightG.toFixed(1)}g · qty {o.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-semibold">${(o.amountCents / 100).toFixed(2)}</div>
                      <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                        o.status === "ready" || o.status === "completed"
                          ? "bg-primary/10 text-primary"
                          : o.status === "disputed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent/10 text-accent"
                      }`}>
                        {o.status}
                      </div>
                    </div>
                  </div>
                  {o.fileKind === "3mf" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() =>
                          window.location.assign(
                            `bambustudio://open?file=${encodeURIComponent(o.fileUrl ?? window.location.origin + "/sample-models/demo.3mf")}`
                          )
                        }
                      >
                        Open in Bambu Studio
                      </Button>
                      {o.fileUrl && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={o.fileUrl} download>Download .3mf</a>
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {o.timeline.slice(-3).reverse().map((t, i) => (
                      <div key={i}>
                        <span className="text-foreground">{t.label}</span>
                        <span className="ml-2">{new Date(t.at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {(o.status === "ready" || o.status === "completed") && !o.rating && (
                      <Button size="sm" variant="soft" onClick={() => {
                        const stars = Number(prompt("Rate this print 1-5", "5") ?? "0");
                        if (stars >= 1 && stars <= 5) {
                          import("@/lib/demoStore").then(({ demoStore }) => demoStore.rateOrder(o.id, stars));
                        }
                      }}>
                        Rate
                      </Button>
                    )}
                    {o.status !== "disputed" && (
                      <Button size="sm" variant="ghost" onClick={() => setDisputeOrder({ id: o.id, maker_id: "demo" })}>
                        <ShieldAlert className="h-3.5 w-3.5" /> Report
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <DisputeDialog
        open={disputeOrder != null}
        onOpenChange={(v) => !v && setDisputeOrder(null)}
        order={disputeOrder}
      />
      <Footer />
    </div>
  );
};

const StatCard = ({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
    <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
  </div>
);

const EmptyState = ({ icon, title, desc, cta }: { icon: React.ReactNode; title: string; desc: string; cta: React.ReactNode }) => (
  <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
    <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    <div className="mt-6">{cta}</div>
  </div>
);

export default Dashboard;
