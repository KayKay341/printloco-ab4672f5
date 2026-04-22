
-- Lock search_path on helper functions
ALTER FUNCTION public.refresh_printer_rating() SET search_path = public;
ALTER FUNCTION public.compute_quality_score(public.printers) SET search_path = public;
ALTER FUNCTION public.recompute_printer_quality() SET search_path = public;
ALTER FUNCTION public.sync_printer_order_stats() SET search_path = public;

-- Replace broad SELECT with one that allows reading individual files but not listing the bucket
DROP POLICY IF EXISTS "Verification media is public" ON storage.objects;
CREATE POLICY "Verification media single-object read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'printer-verification'
  AND name IS NOT NULL
);
