## Plan

1. Replace estimator math with slicer-truth math
- Stop using `computeEstimate()` to scale grams and time from a base value with cubic heuristics.
- Make the quote come only from a real open-source slice run for the current settings: material, layer height, infill, supports, scale, and selected machine/plate.
- Treat the slicer’s generated G-code as the source of truth for material usage by summing actual extrusion moves if metadata looks ambiguous, instead of trusting `filamentUsage`/`materialUsage` blindly.
- Keep raw mesh volume only as an informational/debug stat, never as pricing input.

2. Add selectable build plates and fit validation
- Add a build-plate selector on `/upload` with presets such as Bambu X1 Carbon (256×256), A1 Mini, P1S, etc.
- Parse each printer’s `build_volume` and compare the rotated/scaled model footprint against the selected plate.
- Show clear fit states: fits, too large, or borderline depending on X/Y footprint and Z height.
- Use the selected plate to filter/prioritize maker matches so printers that cannot fit the part are excluded or clearly marked.

3. Upgrade the 3D preview into a plate preview
- Extend `StlPreview` to render a real build plate under the model with dimensions matching the selected preset.
- Center the model on the plate, show plate boundaries/grid, and visually indicate overflow when the part exceeds the plate.
- Add simple orientation/rotation controls relevant to fit checking so the preview and fit logic stay aligned.

4. Rework slicer configuration so units are consistent
- Explicitly normalize uploaded geometry units before slicing so inch-authored models are converted once, not multiplied later in pricing math.
- Pass machine/profile overrides into the slicer for the chosen plate size instead of slicing with generic defaults.
- Add a reliable unit path for STL and keep 3MF embedded slicer data only when it is clearly valid for the active settings.

5. Make pricing depend on actual sliced grams
- Use sliced grams + material price as the pricing basis after each real slice.
- Recompute quote and printer matches whenever the user changes settings that affect the slice.
- Remove the current path where a correct bbox can still lead to an inflated quote because weight/time are being post-scaled outside the slicer.

6. Add regression coverage for the failure cases
- Add tests for mm vs inch uploads, known cube/cylinder fixtures, and at least one large-part scenario that previously produced inflated grams.
- Add tests for plate-fit logic and for the “cannot measure / does not fit” states.

## Files likely to change
- `src/lib/stlSlicer.ts`
- `src/components/CostEstimator.tsx`
- `src/components/StlPreview.tsx`
- `src/pages/Upload.tsx`
- `src/lib/printerScore.ts`
- `src/test/example.test.ts`

## Technical details
- The current overpricing is not just UI: the app still multiplies slicer weight/time in `CostEstimator` using volume-based scaling (`scale^3`, shell heuristics, support multipliers). That can inflate quotes even when bbox looks correct.
- The current slicer package is Cura-based and open source, but its returned metadata fields are too ambiguous to trust directly. The safer implementation is to configure the slicer with explicit machine dimensions and derive usage from generated G-code/extrusion totals when needed.
- Existing `printer_presets` and maker `build_volume` data can be reused for plate presets and fit filtering; no database migration should be necessary unless we later want richer per-printer machine profiles.

## Result
After this change, users will see the model on a real selectable build plate, get a quote based on an actual slice for that machine/profile, and only be matched with printers that can physically print the part.