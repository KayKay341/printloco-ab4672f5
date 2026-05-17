-- Migration to ensure the stl_files table exists and is correctly configured.
-- This fixes the "Could not find the table 'public.stl_files' in the schema cache" error.

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stl_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  material text NOT NULL DEFAULT 'PLA',
  estimated_weight numeric(10,2),
  estimated_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.stl_files ENABLE ROW LEVEL SECURITY;

-- 3. Re-create policies (dropping first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own STL files" ON public.stl_files;
CREATE POLICY "Users can view their own STL files"
  ON public.stl_files FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.orders
      WHERE public.orders.stl_file_id = public.stl_files.id
      AND public.orders.maker_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations
      WHERE public.conversations.stl_file_id = public.stl_files.id
      AND public.conversations.maker_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own STL files" ON public.stl_files;
CREATE POLICY "Users can insert their own STL files"
  ON public.stl_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own STL files" ON public.stl_files;
CREATE POLICY "Users can delete their own STL files"
  ON public.stl_files FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('stl-files', 'stl-files', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Re-create storage policies
DROP POLICY IF EXISTS "Users can upload their own STL files" ON storage.objects;
CREATE POLICY "Users can upload their own STL files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'stl-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can read their own STL files" ON storage.objects;
CREATE POLICY "Users can read their own STL files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'stl-files'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.stl_files f
        JOIN public.orders o ON o.stl_file_id = f.id
        WHERE f.file_path = name
        AND o.maker_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.stl_files f
        JOIN public.conversations c ON c.stl_file_id = f.id
        WHERE f.file_path = name
        AND c.maker_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own STL files" ON storage.objects;
CREATE POLICY "Users can delete their own STL files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'stl-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Ensure permissions are granted (in case they were revoked)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.stl_files TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
