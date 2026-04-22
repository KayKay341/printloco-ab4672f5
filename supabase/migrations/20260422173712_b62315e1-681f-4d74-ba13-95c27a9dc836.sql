-- Extend printers with AMS + bulk + 3MF
ALTER TABLE public.printers
  ADD COLUMN IF NOT EXISTS has_ams boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ams_slot_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS accepts_bulk boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepts_3mf boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_bulk_quantity integer NOT NULL DEFAULT 10;

-- Per-color surcharge on top of material base price
ALTER TABLE public.filament_colors
  ADD COLUMN IF NOT EXISTS surcharge_per_gram numeric NOT NULL DEFAULT 0;

-- Bulk quote requests
CREATE TABLE IF NOT EXISTS public.bulk_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  printer_id uuid NOT NULL,
  maker_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  material text NOT NULL,
  color_name text,
  deadline date,
  budget_cents integer,
  details text NOT NULL,
  reference_file_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'declined', 'cancelled')),
  maker_quote_cents integer,
  maker_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers create their bulk requests"
  ON public.bulk_quote_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Participants view their bulk requests"
  ON public.bulk_quote_requests FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = maker_id);

CREATE POLICY "Participants update their bulk requests"
  ON public.bulk_quote_requests FOR UPDATE
  USING (auth.uid() = customer_id OR auth.uid() = maker_id);

CREATE TRIGGER bulk_quote_requests_set_updated_at
  BEFORE UPDATE ON public.bulk_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_bulk_quote_requests_maker ON public.bulk_quote_requests(maker_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_quote_requests_customer ON public.bulk_quote_requests(customer_id, status);