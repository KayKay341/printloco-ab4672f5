
-- 1) PROFILES: restrict public SELECT
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Order participants view counterpart profile"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE (o.customer_id = auth.uid() AND o.maker_id = profiles.id)
       OR (o.maker_id = auth.uid() AND o.customer_id = profiles.id)
  ));

CREATE POLICY "Conversation participants view counterpart profile"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.customer_id = auth.uid() AND c.maker_id = profiles.id)
       OR (c.maker_id = auth.uid() AND c.customer_id = profiles.id)
  ));

-- 2) PRINTERS: only published, plus owners/admins
DROP POLICY IF EXISTS "Printers are viewable by everyone" ON public.printers;

CREATE POLICY "Published printers viewable by everyone"
  ON public.printers FOR SELECT
  USING (published = true AND is_active = true);

CREATE POLICY "Owners view own printers"
  ON public.printers FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins view all printers"
  ON public.printers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) PRINT_RATINGS: hide customer identities
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.print_ratings;

CREATE POLICY "Participants view ratings"
  ON public.print_ratings FOR SELECT
  USING (auth.uid() = customer_id
         OR auth.uid() = maker_id
         OR public.has_role(auth.uid(), 'admin'));

-- 4) STL_FILES: allow makers to read files for their orders
CREATE POLICY "Makers read STL files for their orders"
  ON public.stl_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.stl_file_id = stl_files.id
      AND o.maker_id = auth.uid()
  ));

-- 5) STORAGE: make printer-verification private + owner/admin reads
UPDATE storage.buckets SET public = false WHERE id = 'printer-verification';

DROP POLICY IF EXISTS "Verification files are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Verification files readable" ON storage.objects;
DROP POLICY IF EXISTS "Public can view verification files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view verification files" ON storage.objects;

CREATE POLICY "Owners read own verification files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'printer-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins read verification files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'printer-verification'
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6) Lock down SECURITY DEFINER helpers from being called via the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_city_signup_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_printer_order_stats() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_printer_rating() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_owner_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_printer_quality() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_quality_score(public.printers) FROM anon, authenticated;
