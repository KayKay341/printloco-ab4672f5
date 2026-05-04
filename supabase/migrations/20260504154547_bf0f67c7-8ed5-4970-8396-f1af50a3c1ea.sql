-- Cache for AI-research-backed cost estimates so we don't re-run the model
-- on identical specs. Keyed by a stable hash of the inputs.
CREATE TABLE IF NOT EXISTS public.estimate_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_hash text NOT NULL UNIQUE,
  service text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_cache ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read cached estimates — they're non-sensitive
-- pricing data and the cache is a public good for the marketplace.
CREATE POLICY "Estimate cache readable by everyone"
  ON public.estimate_cache FOR SELECT
  USING (true);

-- Only the edge function (service role) writes to the cache.
CREATE POLICY "Service role writes estimate cache"
  ON public.estimate_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS estimate_cache_created_at_idx
  ON public.estimate_cache (created_at DESC);