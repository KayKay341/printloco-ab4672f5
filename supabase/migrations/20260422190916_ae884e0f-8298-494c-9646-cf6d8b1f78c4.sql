
-- =====================================================
-- 3D Hubs failure-mode safeguards: verification, quality, disputes
-- =====================================================

-- ---- 1. Storage bucket for verification media (printer photo, sample prints) ----
INSERT INTO storage.buckets (id, name, public)
VALUES ('printer-verification', 'printer-verification', true)
ON CONFLICT (id) DO NOTHING;

-- Public read so badges/sample prints can render. Owner-scoped writes.
DROP POLICY IF EXISTS "Verification media is public" ON storage.objects;
CREATE POLICY "Verification media is public"
ON storage.objects FOR SELECT
USING (bucket_id = 'printer-verification');

DROP POLICY IF EXISTS "Makers upload their verification media" ON storage.objects;
CREATE POLICY "Makers upload their verification media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'printer-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Makers update their verification media" ON storage.objects;
CREATE POLICY "Makers update their verification media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'printer-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Makers delete their verification media" ON storage.objects;
CREATE POLICY "Makers delete their verification media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'printer-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ---- 2. Add quality / verification / activity columns to printers ----
ALTER TABLE public.printers
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS printer_photo_url text,
  ADD COLUMN IF NOT EXISTS serial_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sample_print_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS material_spec_sheets jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS layer_height_min_mm numeric NOT NULL DEFAULT 0.2,
  ADD COLUMN IF NOT EXISTS quality_score integer NOT NULL DEFAULT 50
    CHECK (quality_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'hobbyist'
    CHECK (tier IN ('hobbyist', 'maker', 'professional')),
  ADD COLUMN IF NOT EXISTS total_orders integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_orders integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_order_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_for_inactivity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

-- Backfill: existing demo printers should appear published & verified so the demo doesn't break
UPDATE public.printers
   SET published = true,
       verification_status = 'verified'
 WHERE published = false;

-- ---- 3. Disputes table ----
CREATE TABLE IF NOT EXISTS public.order_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  maker_id uuid NOT NULL,
  reason text NOT NULL,
  description text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reprint_offered', 'refunded', 'resolved', 'rejected')),
  resolution_notes text,
  resolved_at timestamptz,
  reprint_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view disputes"
ON public.order_disputes FOR SELECT
USING (
  auth.uid() = customer_id
  OR auth.uid() = maker_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Customers open disputes"
ON public.order_disputes FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Participants and admins update disputes"
ON public.order_disputes FOR UPDATE
USING (
  auth.uid() = customer_id
  OR auth.uid() = maker_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER trg_disputes_updated
BEFORE UPDATE ON public.order_disputes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_disputes_order ON public.order_disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_maker ON public.order_disputes(maker_id);
CREATE INDEX IF NOT EXISTS idx_disputes_customer ON public.order_disputes(customer_id);

-- ---- 4. Print ratings (drives avg_rating + quality_score) ----
CREATE TABLE IF NOT EXISTS public.print_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  printer_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  maker_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone"
ON public.print_ratings FOR SELECT
USING (true);

CREATE POLICY "Customers rate their orders"
ON public.print_ratings FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE INDEX IF NOT EXISTS idx_ratings_printer ON public.print_ratings(printer_id);

-- Trigger: keep printer aggregate rating in sync
CREATE OR REPLACE FUNCTION public.refresh_printer_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.printers
     SET avg_rating = COALESCE((SELECT AVG(stars)::numeric(3,2) FROM public.print_ratings WHERE printer_id = NEW.printer_id), 0),
         rating_count = (SELECT COUNT(*) FROM public.print_ratings WHERE printer_id = NEW.printer_id)
   WHERE id = NEW.printer_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_printer_rating
AFTER INSERT ON public.print_ratings
FOR EACH ROW EXECUTE FUNCTION public.refresh_printer_rating();

-- ---- 5. Quality score + tier auto-derivation ----
CREATE OR REPLACE FUNCTION public.compute_quality_score(_printer public.printers)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score numeric := 0;
  bv_w integer := 0; bv_h integer := 0; bv_d integer := 0;
  bv_parts text[];
BEGIN
  -- Verification: up to 25
  IF _printer.verification_status = 'verified' THEN score := score + 20; END IF;
  IF _printer.serial_visible THEN score := score + 5; END IF;

  -- Sample prints: up to 15 (5 each, capped at 3)
  score := score + LEAST(array_length(_printer.sample_print_urls, 1), 3) * 5;

  -- Build volume: up to 10 (>=200mm in any axis)
  bv_parts := regexp_split_to_array(COALESCE(_printer.build_volume, '0x0x0'), '[xX×]');
  IF array_length(bv_parts, 1) >= 3 THEN
    BEGIN
      bv_w := (regexp_replace(bv_parts[1], '[^0-9]', '', 'g'))::int;
      bv_h := (regexp_replace(bv_parts[2], '[^0-9]', '', 'g'))::int;
      bv_d := (regexp_replace(bv_parts[3], '[^0-9]', '', 'g'))::int;
    EXCEPTION WHEN OTHERS THEN
      bv_w := 0; bv_h := 0; bv_d := 0;
    END;
    IF GREATEST(bv_w, bv_h, bv_d) >= 256 THEN score := score + 10;
    ELSIF GREATEST(bv_w, bv_h, bv_d) >= 200 THEN score := score + 7;
    ELSIF GREATEST(bv_w, bv_h, bv_d) >= 150 THEN score := score + 4;
    END IF;
  END IF;

  -- Layer height precision: up to 8
  IF _printer.layer_height_min_mm <= 0.08 THEN score := score + 8;
  ELSIF _printer.layer_height_min_mm <= 0.12 THEN score := score + 6;
  ELSIF _printer.layer_height_min_mm <= 0.20 THEN score := score + 3;
  END IF;

  -- Material breadth: up to 7
  score := score + LEAST(COALESCE(array_length(_printer.materials, 1), 0), 5) * 1.4;

  -- AMS bonus
  IF _printer.has_ams THEN score := score + 5; END IF;

  -- Track record: up to 25
  IF _printer.rating_count > 0 THEN
    score := score + LEAST(_printer.avg_rating, 5) * 4; -- up to 20
    score := score + LEAST(_printer.rating_count, 5);   -- up to 5
  END IF;

  -- Reliability: up to 5 (success ratio)
  IF _printer.total_orders > 0 THEN
    score := score + (_printer.successful_orders::numeric / _printer.total_orders) * 5;
  END IF;

  RETURN GREATEST(0, LEAST(100, ROUND(score)::int));
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_printer_quality()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s integer;
BEGIN
  s := public.compute_quality_score(NEW);
  NEW.quality_score := s;
  NEW.tier := CASE
    WHEN s >= 85 THEN 'professional'
    WHEN s >= 60 THEN 'maker'
    ELSE 'hobbyist'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_printer_quality ON public.printers;
CREATE TRIGGER trg_printer_quality
BEFORE INSERT OR UPDATE OF
  verification_status, serial_visible, sample_print_urls, build_volume,
  layer_height_min_mm, materials, has_ams, avg_rating, rating_count,
  total_orders, successful_orders
ON public.printers
FOR EACH ROW EXECUTE FUNCTION public.recompute_printer_quality();

-- Recompute once for existing rows
UPDATE public.printers SET updated_at = updated_at;

-- ---- 6. Order activity sync (last_order_at, totals, hidden_for_inactivity) ----
CREATE OR REPLACE FUNCTION public.sync_printer_order_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.printer_id IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE public.printers
     SET last_order_at = GREATEST(COALESCE(last_order_at, NEW.created_at), NEW.created_at),
         total_orders = total_orders + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
         successful_orders = successful_orders
           + CASE WHEN NEW.status = 'completed'
                       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
                  THEN 1 ELSE 0 END,
         hidden_for_inactivity = false
   WHERE id = NEW.printer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_printer_order_stats ON public.orders;
CREATE TRIGGER trg_sync_printer_order_stats
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_printer_order_stats();

-- ---- 7. Helpful indexes ----
CREATE INDEX IF NOT EXISTS idx_printers_quality ON public.printers(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_printers_tier ON public.printers(tier);
CREATE INDEX IF NOT EXISTS idx_printers_verification ON public.printers(verification_status);
CREATE INDEX IF NOT EXISTS idx_printers_published_active
  ON public.printers(published, is_active)
  WHERE published = true AND is_active = true;
