

# Make Demo Mode + Upload + Pricing Actually Work

Three connected upgrades so visitors can run the **full PrintLoco flow** without admin access, accept models from a URL or 3MF, hand sellers a one-click "Open in Bambu Studio" link, and tune their quote with real input controls (units, quantity, infill, layer height, supports, etc.) instead of a static number.

---

## Part 1 — Demo mode that actually works

Today demo mode just blocks real actions and shows a toast. After this change, a non-admin visitor can run the entire flow end-to-end with simulated data persisted in `localStorage`:

```text
Browse printers (real + demo)
  → Upload STL/3MF/URL (parsed locally, no DB write)
  → Pick a maker
  → Simulated checkout (full UI, fake payment)
  → Order appears in dashboard ("In production")
  → Watch status auto-advance: Paid → Accepted → Printing → Ready
  → Leave a rating, file a demo dispute
Maker side:
  → Publish a demo printer (saved locally, appears in dashboard + /printers)
  → Accept demo orders, mark stages
```

### Files
**New**
- `src/lib/demoStore.ts` — typed localStorage store + pub/sub + auto status progression
- `src/components/DemoCheckout.tsx` — fake 3-step Stripe-lookalike (summary → fake card 4242… → success)

**Edited**
- `src/hooks/useDemoMode.ts` — add `createDemoOrder`, `publishDemoPrinter`, `addDemoUpload`, `rateDemoOrder`, `disputeDemoOrder`
- `src/components/DemoModeBanner.tsx` — richer dismissible banner ("Live demo — every button works")
- `src/components/site/Navbar.tsx` — small "DEMO" pill next to logo
- `src/components/CheckoutDialog.tsx` — render `<DemoCheckout>` in demo mode
- `src/components/BulkQuoteDialog.tsx`, `src/components/DisputeDialog.tsx` — write to demo store, success toast, close
- `src/pages/NewPrinter.tsx` — demo publish path → saves locally → dashboard
- `src/pages/Dashboard.tsx` — merge demo orders, live timeline, "Reset demo" button
- `src/pages/Printers.tsx` — include user-published demo printers
- `src/pages/CheckoutReturn.tsx` — render demo success when `?demo=1`

---

## Part 2 — Upload from URL + better 3MF support

Today users can only upload STL/3MF from disk. Add:

### A) "Paste a model URL" tab
- New tabbed interface on `/upload`: **File** | **From URL**
- URL field accepts direct links to `.stl`, `.3mf`, Thingiverse/Printables/MakerWorld download URLs, or a `data:` URL
- Fetches via a new edge function `fetch-model` (server-side) that:
  - Validates URL (https only, content-type check, 50MB cap)
  - Streams the file and returns it as a base64 blob to the client
  - Reuses the existing `sliceStlBuffer` / `parse3mf` parsers — no re-architecture
- Edge function avoids CORS and prevents malicious local-network fetches (block private IPs)

### B) Improved 3MF handling
- Existing parser already covers Bambu/Orca; expose two new bits:
  - `mfg.printSettings` — extract `layer_height`, `sparse_infill_density`, `support_used`, `nozzle_diameter` from `project_settings.config` so we can pre-fill the cost estimator
  - `mfg.estimatedPrintMinutes` — read Bambu's own slice estimate from `slice_info.config` if present (much more accurate than our heuristic)

### C) "Open in Bambu Studio" seller action
- After a maker accepts an order with a `.3mf`, the order detail card on their dashboard shows a primary button:
  ```
  [ Open in Bambu Studio ]   [ Download .3mf ]
  ```
- Uses the documented Bambu deep-link protocol: `bambustudio://open?file=<signed-download-url>`
- Falls back to plain download + a tooltip ("Bambu Studio not installed? Download here") if the protocol isn't registered (we can't detect cleanly, so the fallback button is always visible next to it)
- Also surfaces in `Dashboard.tsx` for demo orders attached to a 3MF — using a sample bundled `.3mf` in `/public/sample-models/` so the demo button fully works

---

## Part 3 — A real cost estimator (input controls)

Today the right-hand "Live estimate" is just `weightG × material price`. Replace it with an interactive estimator that recomputes on every change.

### New `src/components/CostEstimator.tsx`
A self-contained card with these inputs (all live, debounced 150ms):

| Control | UI | Effect |
|---|---|---|
| **Units** | toggle `mm / inch` | converts displayed bbox + scales geometry preview |
| **Scale %** | number input + slider (10–500%) | re-runs slice with `geometry.scale()` clone |
| **Quantity** | number input with +/- buttons (1–500) | multiplies weight, time, and price |
| **Material** | pill row (already exists) | swaps density + base price |
| **Infill %** | slider 0–100, default 20 | re-runs slicer with new infill |
| **Layer height** | select 0.08 / 0.12 / 0.16 / 0.2 / 0.28 mm | scales print time linearly |
| **Walls / shells** | number input 1–5, default 3 | adds shell-volume bump to weight |
| **Supports** | toggle | +8% material, +12% time when on |
| **Rush** | toggle (24h) | +25% price surcharge |

Outputs (always visible):
- **Total cost** (large): `((basePrice × qty) + colorSurcharge + supportsBump) × rushMultiplier`
- **Per-unit cost** (small)
- **Material weight** in grams + ounces
- **Print time** total + per-unit (h:m)
- **Bounding box** in selected units
- **Triangle count** (debug stat)

### Slicer changes (`src/lib/stlSlicer.ts`)
Add params: `walls`, `layerHeightMm`, `supports`, `quantity`, `scale`. Refactor return to include `perUnit` and `total` figures. Existing 3MF path gets the same shape via a small adapter so the estimator component is geometry-agnostic.

### Upload page wiring
- Replace the static "Live estimate" block with `<CostEstimator />`
- The estimator's resolved `{ amountCents, weightG, notes }` flows into `handleBook()` and `handleSaveQuote()` so the price shown is what's charged
- Match score (`scorePrinter`) re-runs whenever weight changes — top matches stay accurate

---

## Out of scope
- No real Stripe charges, no DB writes in demo mode
- No new database migrations needed
- No changes to admin-only flows
- We're not building a real slicer — the estimator stays a calibrated heuristic, but with much more user control

