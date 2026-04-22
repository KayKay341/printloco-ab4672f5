
CREATE OR REPLACE FUNCTION public.get_referral_stats(_code text)
RETURNS TABLE (
  total bigint,
  masked_email text,
  city text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH refs AS (
    SELECT email, city, created_at
    FROM public.waitlist_signups
    WHERE referred_by = _code
    ORDER BY created_at DESC
  )
  SELECT
    (SELECT count(*) FROM refs) AS total,
    CASE
      WHEN position('@' in email) > 1
        THEN substring(email, 1, 1) || '***' || substring(email from position('@' in email))
      ELSE '***'
    END AS masked_email,
    city,
    created_at AS joined_at
  FROM refs;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats(text) TO anon, authenticated;
