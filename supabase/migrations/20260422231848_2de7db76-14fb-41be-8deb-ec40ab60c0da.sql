ALTER TABLE public.printers
  ADD CONSTRAINT printers_owner_profile_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';