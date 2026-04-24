# In-Browser Slicer — Plan

Turn `/upload` into a slicer-style workspace: load parts onto a build plate, move/rotate them, add duplicates or extra plates, then press **Slice plate** to compute weight/time/cost (no more instant re-slice on every input change).

---

## What the user gets

1. **A build plate workspace** showing every part you've added, with a top-down + 3D orbit view.
2. **Per-part transform controls** — translate (X/Y), rotate (X/Y/Z in 90°/free steps), "lay flat", duplicate, delete.
3. **Multi-part / multi-plate** — add another copy of the current part, add more parts, or add additional plates if it doesn't all fit.
4. **Manual slicing** — settings (material, infill, layer height, walls, supports, scale, plate, units) just edit the *plan*. Nothing slices until you press **Slice plate**.
5. **Slice output panel** — grams, filament length, print time, cost, per-part breakdown, and the printer match list. A "Stale" badge appears whenever a setting changes after the last slice.
6. **Plate fit indicator** — collisions between parts and overflow off the plate are highlighted in red live (no slicing required).

---

## UX flow

```text
Upload .stl/.3mf  ──►  Part appears centered on Plate 1
                          │
                          ▼
   [Move] [Rotate] [Duplicate] [Delete] [Lay flat] [Auto-arrange]
                          │
   Settings panel: material, infill, layer h, walls, supports, scale, plate model
                          │
                          ▼
                 ┌──────────────────────┐
                 │  ⏵  Slice plate      │  ← only this triggers Cura WASM
                 └──────────────────────┘
                          │
                          ▼
   Result: 134.2 g · 1h 47m · $26.80   [Stale once any setting changes]
   Per-part rows · Printer matches · Checkout
```

Tabs at the top of the workspace: **Plate 1 · Plate 2 · + Add plate**.

---

## Technical changes

### New files
- `src/lib/sliceJob.ts` — types for `Part` (`id`, `fileName`, `buffer`, `geometry`, `transform {tx,ty,rotX,rotY,rotZ,scale}`) and `Plate` (`id`, `plateId`, `parts: Part[]`, `lastSlice: SliceResult | null`, `dirty: boolean`).
- `src/lib/stlTransform.ts` — apply translate/rotate/scale to an STL `ArrayBuffer` (reuse the binary/ASCII rewriter already in `stlSlicer.ts`, extend it with a 3×3 rotation + offset). Used both for preview and to bake transforms before handing to Cura.
- `src/lib/mergeStl.ts` — merge multiple transformed STL buffers into one binary STL so Cura WASM slices the whole plate as a single job (Cura WASM only accepts one mesh per slice call).
- `src/components/PartTransformPanel.tsx` — translate/rotate sliders + 90° step buttons, lay-flat, duplicate, delete.
- `src/components/PlateTabs.tsx` — tab strip with dirty/sliced badge per plate.

### Modified files
- `src/components/StlPreview.tsx`
  - Accept `parts: { geometry, transform, color, selected, collides }[]` instead of a single geometry.
  - Render each part with its transform; outline the selected part; tint colliding parts red.
  - Add click-to-select and drag-on-plate (XY) using a Three.js raycaster + plane drag.
- `src/pages/Upload.tsx`
  - Remove the auto-slice `useEffect` (the one keyed on every cost input). Replace with explicit `handleSlicePlate()` triggered by a button.
  - Hold a `plates: Plate[]` array + `activePlateId` in state; replace single-`file`/`slice` state.
  - Mark `activePlate.dirty = true` whenever any part transform or slice setting changes.
  - On **Slice plate**: bake each part's transform via `stlTransform`, merge with `mergeStl`, call `sliceStlBufferAccurate`, store result on the plate, clear `dirty`.
  - Drive printer matching off `activePlate.lastSlice` (or the sum across plates for "all plates" view).
- `src/components/CostEstimator.tsx`
  - Add a `dirty` prop. When true, show a "Settings changed — re-slice for an accurate quote" banner and grey-out the price.
  - Remove the `useEffect` auto-call to `onResolved` when dirty.

### Slicer integration details
- Cura WASM still slices a single mesh per call → we **bake transforms + merge** client-side. Each part's STL is rewritten with its rotation/translation, then concatenated into one binary STL (header + summed triCount + concatenated triangle blocks). This keeps `gramsFromGcode` accurate because the slicer sees the real plate layout.
- Plate dimensions still drive `machine_width/depth/height` overrides.
- Collision detection is a cheap AABB check on each part's bounding box after transform — runs every frame, no slicer needed.

### State shape (Upload.tsx)
```ts
type PartState = {
  id: string;
  fileName: string;
  kind: "stl" | "3mf";
  buffer: ArrayBuffer;          // original file bytes
  geometry: BufferGeometry;     // for preview
  transform: { tx: number; ty: number; rotX: number; rotY: number; rotZ: number; scale: number };
  color: string;
};
type PlateState = {
  id: string;
  plateId: string;              // BUILD_PLATES id
  parts: PartState[];
  lastSlice: SliceResult | null;
  dirty: boolean;
};
```

### Out of scope (this pass)
- Auto-arrange/nesting algorithm beyond a simple grid placement when duplicating.
- 3MF transform baking (3MF jobs stay single-part, single-plate; warn if user adds a 3MF to a multi-part plate).
- Saving plate layouts to the backend.

---

## Acceptance criteria
- Changing infill/layer height/scale/etc. **does not** trigger a slice; the price is greyed out with a "Stale" pill until **Slice plate** is pressed.
- I can drag a part on the plate, rotate it 90° on Z, duplicate it, and see both copies on the plate; collision overlap highlights red.
- Pressing **Slice plate** produces grams/time consistent with the actual transformed layout (verified by adding 2× the same part → ~2× grams).
- Adding a second plate gives a separate tab with its own parts, dirty state, and slice result.
- Existing single-STL flow (upload → slice → match printer → checkout) still works end-to-end.
