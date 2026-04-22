import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: { id: string; maker_id: string } | null;
};

const REASONS = [
  "Print failed / broken",
  "Wrong color or material",
  "Poor surface quality",
  "Wrong dimensions",
  "Never delivered",
  "Other",
];

export const DisputeDialog = ({ open, onOpenChange, order }: Props) => {
  const { user } = useAuth();
  const { isDemo, demoToast } = useDemoMode();
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !order) return;
    if (description.trim().length < 10) {
      toast.error("Add a sentence describing the issue.");
      return;
    }
    if (isDemo) {
      demoToast("file a real dispute");
      onOpenChange(false);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("order_disputes").insert({
        order_id: order.id,
        customer_id: user.id,
        maker_id: order.maker_id,
        reason,
        description: description.trim(),
      });
      if (error) throw error;
      toast.success("Issue reported. Maker has 7 days to reprint or we'll refund.");
      onOpenChange(false);
      setDescription("");
    } catch (err: any) {
      toast.error(err.message ?? "Could not file dispute");
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Report a print issue
          </DialogTitle>
          <DialogDescription>
            We back every print. The maker has <strong>7 days</strong> to reprint
            or we'll refund you in full.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="reason">What went wrong?</Label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="desc">Describe what happened</Label>
            <Textarea
              id="desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The bottom layers didn't adhere — part is warped on one side."
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={submitting}>
              {submitting ? "Sending…" : "Report issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeDialog;
