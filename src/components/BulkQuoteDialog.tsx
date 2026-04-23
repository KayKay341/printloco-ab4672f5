import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { toast } from "sonner";
import { Package } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  printer: {
    id: string;
    owner_id: string;
    brand: string;
    model: string;
    materials: string[];
    min_bulk_quantity?: number;
  } | null;
};

export default function BulkQuoteDialog({ open, onOpenChange, printer }: Props) {
  const { user } = useAuth();
  const { isDemo, demoToast } = useDemoMode();

  const [quantity, setQuantity] = useState(printer?.min_bulk_quantity ?? 25);
  const [material, setMaterial] = useState(printer?.materials[0] ?? "PLA");
  const [colorName, setColorName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const minQty = printer?.min_bulk_quantity ?? 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to send a bulk request.");
      return;
    }
    if (!printer) return;
    if (quantity < minQty) {
      toast.error(`This maker requires at least ${minQty} units for bulk.`);
      return;
    }
    if (details.trim().length < 10) {
      toast.error("Please describe what you need (at least a sentence).");
      return;
    }
    if (isDemo) {
      // Simulated bulk request — no DB write.
      toast.success("Bulk request sent (demo)", {
        description: `We'd notify ${printer.brand} ${printer.model} about your ${quantity}-unit order. They typically reply in ~12h.`,
      });
      onOpenChange(false);
      setDetails("");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("bulk_quote_requests").insert({
        customer_id: user.id,
        printer_id: printer.id,
        maker_id: printer.owner_id,
        quantity,
        material,
        color_name: colorName || null,
        deadline: deadline || null,
        budget_cents: budget ? Math.round(Number(budget) * 100) : null,
        details: details.trim(),
      });
      if (error) throw error;
      toast.success("Request sent — the maker will reply with a quote.");
      onOpenChange(false);
      setDetails("");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!printer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Package className="h-5 w-5 text-primary" />
            Contract this printer
          </DialogTitle>
          <DialogDescription>
            Request a custom quote from <strong>{printer.brand} {printer.model}</strong>. Minimum {minQty} units.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={minQty}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 0))}
                required
              />
            </div>
            <div>
              <Label htmlFor="mat">Material</Label>
              <select
                id="mat"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {printer.materials.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="color">Color (optional)</Label>
              <Input
                id="color"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="Matte black"
              />
            </div>
            <div>
              <Label htmlFor="deadline">Need by (optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="budget">Target budget (USD, optional)</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="500"
            />
          </div>

          <div>
            <Label htmlFor="details">Project details</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Looking for 50 enclosure brackets — share STL link, dimensions, finish requirements…"
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={submitting}>
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
