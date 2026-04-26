import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Download,
  FileBox,
  Inbox,
  MapPin,
  Package,
  Phone,
  Search,
  Sparkles,
  User,
  ExternalLink,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDemoMode } from "@/hooks/useDemoMode";

type MakerOrder = {
  id: string;
  status: string;
  amount_total: number;
  material: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  customer_id: string;
  printer_id: string | null;
  stl_file_id: string | null;
  pickup_code: string | null;
  printers: { brand: string; model: string } | null;
  stl_files: {
    file_name: string;
    file_path: string;
    file_size: number;
    estimated_weight: number | null;
  } | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
    neighborhood: string | null;
    zip_code: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-muted text-muted-foreground" },
  { value: "accepted", label: "Accepted", color: "bg-accent/15 text-accent" },
  { value: "printing", label: "Printing", color: "bg-primary/15 text-primary" },
  { value: "ready", label: "Ready for pickup", color: "bg-primary/20 text-primary" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/15 text-emerald-600" },
  { value: "cancelled", label: "Cancelled", color: "bg-destructive/10 text-destructive" },
];

const statusColor = (s: string) =>
  STATUS_OPTIONS.find((o) => o.value === s)?.color ?? "bg-muted text-muted-foreground";

const formatBytes = (bytes: number) => {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

export default function MakerOrders({ userId }: { userId: string }) {
  const { isDemo } = useDemoMode();
  const [orders, setOrders] = useState<MakerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MakerOrder | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, status, amount_total, material, quantity, notes, created_at,
         customer_id, printer_id, stl_file_id, pickup_code,
         printers(brand, model),
         stl_files(file_name, file_path, file_size, estimated_weight),
         profiles!orders_customer_id_fkey(full_name, phone, neighborhood, zip_code)`
      )
      .eq("maker_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback without profiles join if FK isn't named
      const { data: data2 } = await supabase
        .from("orders")
        .select(
          `id, status, amount_total, material, quantity, notes, created_at,
           customer_id, printer_id, stl_file_id, pickup_code,
           printers(brand, model),
           stl_files(file_name, file_path, file_size, estimated_weight)`
        )
        .eq("maker_id", userId)
        .order("created_at", { ascending: false });
      const rows = ((data2 as unknown) as MakerOrder[]) ?? [];
      // load customer profiles separately
      const ids = Array.from(new Set(rows.map((r) => r.customer_id))).filter(Boolean);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, phone, neighborhood, zip_code")
          .in("id", ids);
        const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
        rows.forEach((r) => {
          const p = profMap.get(r.customer_id);
          if (p) r.profiles = p as MakerOrder["profiles"];
        });
      }
      setOrders(rows);
    } else {
      setOrders(((data as unknown) as MakerOrder[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // realtime updates for new orders
    const channel = supabase
      .channel(`maker-orders-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `maker_id=eq.${userId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const downloadFile = async (filePath: string, fileName: string) => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("stl-files")
        .createSignedUrl(filePath, 60 * 10);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`Downloading ${fileName}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not download file");
    } finally {
      setDownloading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Order marked as ${status}`);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    if (selected?.id === orderId) setSelected({ ...selected, status });
  };

  const byStatus = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const q = search.trim().toLowerCase();
  const filtered = !q
    ? byStatus
    : byStatus.filter((o) => {
        const name = o.profiles?.full_name?.toLowerCase() ?? "";
        const file = o.stl_files?.file_name?.toLowerCase() ?? "";
        const id = o.id.toLowerCase();
        return name.includes(q) || file.includes(q) || id.includes(q);
      });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    printing: orders.filter((o) => ["accepted", "printing"].includes(o.status)).length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Loading your orders…
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Inbox className="h-8 w-8" />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold">No orders yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          When customers send you a print job, the STL or 3MF file and all order details will show up here.
        </p>
        {isDemo && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent">
            <Sparkles className="h-3 w-3" /> Demo mode — try uploading a file from the customer side to simulate.
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Search + filter chips */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or file name…"
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All", n: counts.all },
            { id: "pending", label: "New", n: counts.pending },
            { id: "printing", label: "In progress", n: counts.printing },
            { id: "ready", label: "Ready", n: counts.ready },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label} <span className="ml-1 opacity-70">({c.n})</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="mb-4 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No orders match{search ? ` "${search}"` : " this filter"}.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer & file</TableHead>
              <TableHead>Printer</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => {
              const ext = o.stl_files?.file_name.split(".").pop()?.toLowerCase();
              return (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="font-medium">{o.profiles?.full_name || "Customer"}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileBox className="h-3 w-3" />
                      <span className="truncate max-w-[220px]">
                        {o.stl_files?.file_name ?? "(no file)"}
                      </span>
                      {ext && (
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] uppercase">
                          {ext}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.printers ? `${o.printers.brand} ${o.printers.model}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.material} × {o.quantity}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(o.status)}`}>
                      {o.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${(o.amount_total / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(o)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={selected != null} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  Order #{selected.id.slice(0, 8)}
                </DialogTitle>
                <DialogDescription>
                  Placed {new Date(selected.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* File card */}
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Print file
                      </div>
                      <div className="mt-1 truncate font-display text-lg font-semibold">
                        {selected.stl_files?.file_name ?? "No file attached"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatBytes(selected.stl_files?.file_size ?? 0)}
                        {selected.stl_files?.estimated_weight
                          ? ` · est. ${selected.stl_files.estimated_weight}g`
                          : ""}
                      </div>
                    </div>
                    {selected.stl_files?.file_path && (
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="hero"
                          disabled={downloading}
                          onClick={() =>
                            downloadFile(
                              selected.stl_files!.file_path,
                              selected.stl_files!.file_name
                            )
                          }
                        >
                          <Download className="h-4 w-4" /> Download
                        </Button>
                        {selected.stl_files.file_name.toLowerCase().endsWith(".3mf") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from("stl-files")
                                .createSignedUrl(selected.stl_files!.file_path, 60 * 10);
                              if (data?.signedUrl) {
                                window.location.assign(
                                  `bambustudio://open?file=${encodeURIComponent(data.signedUrl)}`
                                );
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4" /> Open in slicer
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Print specs */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Spec label="Material" value={selected.material} icon={<Package className="h-3.5 w-3.5" />} />
                  <Spec label="Quantity" value={String(selected.quantity)} icon={<FileBox className="h-3.5 w-3.5" />} />
                  <Spec
                    label="Total"
                    value={`$${(selected.amount_total / 100).toFixed(2)}`}
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                  />
                </div>

                {/* Customer */}
                <div className="rounded-2xl border border-border p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer
                  </div>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {selected.profiles?.full_name || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selected.profiles?.phone || "Not provided"}
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {selected.profiles?.neighborhood || selected.profiles?.zip_code || "—"}
                    </div>
                  </div>
                  {selected.notes && (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Customer notes
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{selected.notes}</div>
                    </div>
                  )}
                  {selected.pickup_code && (
                    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Pickup code
                      </div>
                      <div className="mt-1 font-mono text-lg font-semibold tracking-wider">
                        {selected.pickup_code}
                      </div>
                    </div>
                  )}
                </div>

                {/* Update status */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                  <div className="text-sm font-semibold">Update status:</div>
                  <Select
                    value={selected.status}
                    onValueChange={(v) => updateStatus(selected.id, v)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const Spec = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {icon} {label}
    </div>
    <div className="mt-1 font-display text-base font-semibold">{value}</div>
  </div>
);
