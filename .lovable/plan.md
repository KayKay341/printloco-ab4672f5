## Goal

Expand PrintLoco beyond 3D printing to **laser cutting, embroidery, CNC, and vinyl cutting** — with smoother UI transitions, proper file viewing per service, and a **research-backed cost estimator** (with a $2 minimum) that gives users a fair, market-aware quote for every service.

## What we'll build

### 1. Service catalog
`src/lib/services.ts` — central registry for each service: id, icon, accepted file types, materials, quality presets, preview type, and base pricing rules.

Services: **3D print, laser cut, embroidery, CNC mill, vinyl/sticker**.

### 2. Multi-service order flow
- New route `/order/:service` (`src/pages/Order.tsx`) keyed off the service param. Old `/upload` redirects to `/order/3d-print`.
- New `src/pages/Services.tsx` at `/services` — Etsy-style grid of all services with examples and starting prices.
- `ServicePicker` chip row at the top of the Order page so users can switch services without losing progress.

### 3. Per-service file viewers
- **3D print / CNC** — reuse `StlPreview` (STL/3MF/OBJ/STEP).
- **Laser cut / Vinyl** — new `SvgPreview` (SVG/DXF/PDF) with cut-line color legend and a bounding box readout in mm/inches.
- **Embroidery** — new `EmbroideryPreview` parses DST/PES headers for stitch count, dimensions, color changes; renders the stitch path on canvas.

### 4. Research-backed cost estimator (the $2-minimum quote engine)

A new edge function `estimate-cost` that combines **deterministic local math** + **AI research** for a fair, defensible price.

**Local math (always runs, instant):**
- 3D print: time × machine rate + grams × material rate
- Laser cut: cut-length(mm) × material-cut-rate + engrave-area × engrave-rate + setup
- Embroidery: stitch-count × per-1k-stitch rate + hooping fee
- CNC: machine-minutes × rate + stock cost + tool wear
- Vinyl: area × media rate + weeding complexity surcharge
- All services: apply **`Math.max(2.00, computed)` floor** so nothing prices below $2.

**AI research layer (optional, runs on "Refine with research"):**
- Edge function calls **Lovable AI** (`google/gemini-3-flash-preview`) with tool-calling for structured output: `{ marketLow, marketTypical, marketHigh, sources[], confidence, notes }`.
- The prompt asks the model to estimate fair market pricing for the job specs (service, material, dimensions, complexity, ZIP) using its general knowledge of comparable shops/marketplaces (Etsy, Sculpteo, Ponoko, Xometry, local maker pricing).
- We blend: `final = clamp(localEstimate, marketLow*0.9, marketHigh*1.1)` and **never below $2**.
- Returned to the UI with a "Why this price" expandable showing the local breakdown, market range, and AI reasoning.

**Caching:** estimates are keyed by `(service, material, dims, options)` and cached in the `estimate_cache` table for 7 days to avoid re-running AI on identical specs.

**UI:** A new `CostEstimator.tsx` panel on the Order page shows:
- Live local estimate as the user adjusts settings (updates instantly).
- Big primary number, small "From $2.00 minimum" label when the floor kicks in.
- "Refine with research" button → calls the edge function, animates in the market range bar (`Low ─●─ High`), confidence chip, and a 2-3 sentence rationale.
- "What's included" list (material, machine time, setup, platform fee).

### 5. Smoother transitions everywhere
- Add `framer-motion` and wrap `<Routes>` in `AnimatePresence` for a 250ms fade+slide page transition (`src/components/PageTransition.tsx`).
- Replace abrupt toggles with `motion.div` `layout` animations: preset cards, advanced-settings collapse, preview swap, estimate panel.
- Use existing Tailwind `animate-fade-in`, `animate-scale-in`, `animate-accordion-down` on cards and the new market-range bar.
- Animated stepper (`Service → Upload → Quality → Quote → Maker`) with progress fill.
- Smooth-scroll to the next step when one completes.

### 6. UI restructure
- **Navbar**: replace "Upload STL" with a **"Make something"** dropdown listing all services + "Browse all".
- **Hero**: rotating headline cycling through "3D printed…", "Laser cut…", "Embroidered…", "CNC machined…", "Vinyl cut…".
- **HowItWorks**: generalize to "Upload → quote → match → make → pickup".
- `PrinterMatches` → `MakerMatches`, filtered by which services each maker offers.

### 7. Maker side
- `BecomeMaker` onboarding adds multi-select for services offered with per-service capability fields (3D bed size, laser bed + max thickness, hoop size, CNC envelope, vinyl width).
- `MakerOrders` shows a service-type badge per order; file actions adapt per type (STL → "Open in slicer", SVG → "Open in LightBurn", DST → "Send to machine").

## Database (Lovable Cloud)

```sql
create type public.service_type as enum
  ('3d_print','laser_cut','embroidery','cnc','vinyl');

-- per-maker offered services + capabilities
create table public.maker_services (
  id uuid primary key default gen_random_uuid(),
  maker_id uuid not null references auth.users(id) on delete cascade,
  service service_type not null,
  capabilities jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (maker_id, service)
);
alter table public.maker_services enable row level security;
-- policies: maker manages own; public can read active rows

-- attach service to existing tables
alter table public.orders     add column service service_type not null default '3d_print';
alter table public.stl_files  add column service service_type not null default '3d_print';

-- AI research cache for cost estimator
create table public.estimate_cache (
  id uuid primary key default gen_random_uuid(),
  spec_hash text not null unique,
  service service_type not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.estimate_cache enable row level security;
-- policy: anyone authenticated can select; only service role inserts (via edge function)
```

## Edge function

`supabase/functions/estimate-cost/index.ts`
- Input: `{ service, material, dims, options }`
- Computes local estimate, checks cache, optionally calls Lovable AI Gateway with `tool_choice` for structured `{ marketLow, marketTypical, marketHigh, confidence, rationale, sources }`.
- Applies `$2.00` floor and the blend rule.
- Handles 429/402 from the gateway and surfaces friendly errors to the client.

## Files

**New**
- `src/lib/services.ts`, `src/lib/pricing.ts` (local math + $2 floor)
- `src/pages/Services.tsx`, `src/pages/Order.tsx`
- `src/components/SvgPreview.tsx`, `src/components/EmbroideryPreview.tsx`
- `src/components/ServicePicker.tsx`, `src/components/CostEstimator.tsx`
- `src/components/PageTransition.tsx`
- `supabase/functions/estimate-cost/index.ts`

**Edited**
- `src/App.tsx` — new routes, AnimatePresence, `/upload` redirect
- `src/components/site/Navbar.tsx` — "Make something" dropdown
- `src/components/site/Hero.tsx` — rotating headline
- `src/components/site/HowItWorks.tsx` — generalized copy
- `src/components/PrinterMatches.tsx` → `MakerMatches.tsx` (service-aware)
- `src/components/MakerOrders.tsx` — service badge + per-type file actions
- `src/pages/BecomeMaker.tsx`, `src/pages/Dashboard.tsx` — services manager
- `package.json` — `framer-motion`, `dxf-parser`

## Out of scope (will ask before adding)
- True machine-code generation for laser/embroidery (we render previews and pass files through to the maker).
- Real-time scraping of competitor sites — the AI uses its trained knowledge; we can swap in Perplexity/Firecrawl later if you want live citations.

## Approval
Approve to proceed. Order of work: DB migration → services registry + local pricing → Order page + previews → estimate-cost edge function + CostEstimator UI → page transitions polish → maker side updates.