-- Allow admins to update any printer (for verification review)
CREATE POLICY "Admins can update any printer"
ON public.printers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admins to view all profiles already exists (profiles are public for SELECT).
-- Allow admins to view all printers already exists (printers are public for SELECT).