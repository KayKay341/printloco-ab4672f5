-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. First admin claim (one-shot bootstrap)
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

-- 3. Cities
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waitlist' CHECK (status IN ('waitlist','launching','live')),
  launch_date DATE,
  signup_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities viewable by everyone" ON public.cities
  FOR SELECT USING (true);
CREATE POLICY "Admins insert cities" ON public.cities
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update cities" ON public.cities
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete cities" ON public.cities
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.cities (name, slug, status, launch_date) VALUES
  ('Austin, TX', 'austin', 'launching', '2026-06-01'),
  ('Brooklyn, NY', 'brooklyn', 'waitlist', '2026-09-01'),
  ('Oakland, CA', 'oakland', 'waitlist', '2026-09-01'),
  ('Portland, OR', 'portland', 'waitlist', '2026-12-01');

-- 4. Waitlist referrals
ALTER TABLE public.waitlist_signups
  ADD COLUMN referral_code TEXT UNIQUE,
  ADD COLUMN referred_by TEXT;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER waitlist_set_referral
  BEFORE INSERT ON public.waitlist_signups
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

CREATE OR REPLACE FUNCTION public.bump_city_signup_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.city IS NOT NULL THEN
    UPDATE public.cities
      SET signup_count = signup_count + 1
      WHERE slug = lower(NEW.city) OR lower(name) = lower(NEW.city);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER waitlist_bump_city
  AFTER INSERT ON public.waitlist_signups
  FOR EACH ROW EXECUTE FUNCTION public.bump_city_signup_count();

-- 5. Admin read access on waitlist + investor leads
CREATE POLICY "Admins view waitlist" ON public.waitlist_signups
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view investor leads" ON public.investor_leads
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));