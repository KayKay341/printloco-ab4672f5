
-- SECURITY DEFINER RPC so visitors never hit RLS on the table.
CREATE OR REPLACE FUNCTION public.join_waitlist(
  _email text,
  _role text DEFAULT 'customer',
  _zip_code text DEFAULT NULL,
  _city text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _source text DEFAULT 'waitlist_page',
  _referred_by text DEFAULT NULL,
  _referral_code text DEFAULT NULL
)
RETURNS TABLE(referral_code text, already_joined boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_email text := lower(btrim(coalesce(_email, '')));
  cleaned_role  text := coalesce(nullif(btrim(_role), ''), 'customer');
  existing_code text;
  new_code      text;
BEGIN
  IF cleaned_email IS NULL
     OR length(cleaned_email) < 3
     OR length(cleaned_email) > 320
     OR cleaned_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email' USING ERRCODE = '22023';
  END IF;

  IF cleaned_role NOT IN ('customer','maker','nonprofit') THEN
    RAISE EXCEPTION 'invalid role' USING ERRCODE = '22023';
  END IF;

  SELECT ws.referral_code INTO existing_code
  FROM public.waitlist_signups ws
  WHERE lower(ws.email) = cleaned_email
  LIMIT 1;

  IF existing_code IS NOT NULL THEN
    referral_code := existing_code;
    already_joined := true;
    RETURN NEXT;
    RETURN;
  END IF;

  new_code := COALESCE(
    nullif(btrim(_referral_code), ''),
    lower(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8))
  );

  INSERT INTO public.waitlist_signups
    (email, role, zip_code, city, notes, source, referred_by, referral_code)
  VALUES
    (cleaned_email, cleaned_role,
     nullif(btrim(_zip_code), ''),
     nullif(btrim(_city), ''),
     nullif(_notes, ''),
     coalesce(nullif(btrim(_source), ''), 'waitlist_page'),
     nullif(btrim(_referred_by), ''),
     new_code);

  referral_code := new_code;
  already_joined := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.join_waitlist(text,text,text,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text,text,text,text,text,text,text,text) TO anon, authenticated;
