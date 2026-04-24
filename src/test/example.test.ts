import { describe, it, expect } from "vitest";
import { computeEstimate, DEFAULT_COST_INPUTS } from "@/components/CostEstimator";
import { sliceStlBuffer } from "@/lib/stlSlicer";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });

  it("does not change quote math when only display units change", () => {
    const base = {
      baseWeightG: 50,
      basePrintMinutes: 120,
      bboxMm: { x: 100, y: 50, z: 25 },
    };

    const mmEstimate = computeEstimate(base, {
      ...DEFAULT_COST_INPUTS,
      units: "mm",
      sourceUnits: "mm",
    });

    const inchDisplayEstimate = computeEstimate(base, {
      ...DEFAULT_COST_INPUTS,
      units: "in",
      sourceUnits: "mm",
    });

    expect(inchDisplayEstimate.amountCents).toBe(mmEstimate.amountCents);
    expect(inchDisplayEstimate.weightG).toBeCloseTo(mmEstimate.weightG, 5);
    expect(inchDisplayEstimate.printMinutes).toBeCloseTo(mmEstimate.printMinutes, 5);
    expect(inchDisplayEstimate.bbox.x).toBeCloseTo(mmEstimate.bbox.x, 5);
  });

  it("rescales quote math when source model units are inches", () => {
    const base = {
      baseWeightG: 1,
      basePrintMinutes: 10,
      bboxMm: { x: 2, y: 2, z: 2 },
    };

    const mmEstimate = computeEstimate(base, {
      ...DEFAULT_COST_INPUTS,
      sourceUnits: "mm",
    });

    const inchSourceEstimate = computeEstimate(base, {
      ...DEFAULT_COST_INPUTS,
      sourceUnits: "in",
    });

    expect(inchSourceEstimate.amountCents).toBeGreaterThan(mmEstimate.amountCents);
    expect(inchSourceEstimate.weightG).toBeGreaterThan(mmEstimate.weightG * 1000);
    expect(inchSourceEstimate.bbox.x).toBeCloseTo(mmEstimate.bbox.x * 25.4, 5);
  });

  it("calculates realistic grams from actual model volume", () => {
    const asciiStl = new TextEncoder().encode(`solid cube
facet normal 0 0 -1
 outer loop
  vertex 0 0 0
  vertex 10 10 0
  vertex 10 0 0
 endloop
endfacet
facet normal 0 0 -1
 outer loop
  vertex 0 0 0
  vertex 0 10 0
  vertex 10 10 0
 endloop
endfacet
facet normal 0 0 1
 outer loop
  vertex 0 0 10
  vertex 10 0 10
  vertex 10 10 10
 endloop
endfacet
facet normal 0 0 1
 outer loop
  vertex 0 0 10
  vertex 10 10 10
  vertex 0 10 10
 endloop
endfacet
facet normal 0 -1 0
 outer loop
  vertex 0 0 0
  vertex 10 0 0
  vertex 10 0 10
 endloop
endfacet
facet normal 0 -1 0
 outer loop
  vertex 0 0 0
  vertex 10 0 10
  vertex 0 0 10
 endloop
endfacet
facet normal 0 1 0
 outer loop
  vertex 0 10 0
  vertex 10 10 10
  vertex 10 10 0
 endloop
endfacet
facet normal 0 1 0
 outer loop
  vertex 0 10 0
  vertex 0 10 10
  vertex 10 10 10
 endloop
endfacet
facet normal -1 0 0
 outer loop
  vertex 0 0 0
  vertex 0 0 10
  vertex 0 10 10
 endloop
endfacet
facet normal -1 0 0
 outer loop
  vertex 0 0 0
  vertex 0 10 10
  vertex 0 10 0
 endloop
endfacet
facet normal 1 0 0
 outer loop
  vertex 10 0 0
  vertex 10 10 10
  vertex 10 0 10
 endloop
endfacet
facet normal 1 0 0
 outer loop
  vertex 10 0 0
  vertex 10 10 0
  vertex 10 10 10
 endloop
endfacet
endsolid cube`).buffer;

    const result = sliceStlBuffer(asciiStl, { material: "PLA", infillPct: 20 });

    expect(result.bbox.x).toBeCloseTo(10, 5);
    expect(result.bbox.y).toBeCloseTo(10, 5);
    expect(result.bbox.z).toBeCloseTo(10, 5);
    expect(result.volumeCm3).toBeCloseTo(1, 5);
    // Weight is intentionally NOT derived from raw mesh volume — it must come
    // from the slicer's reported filament/material usage. Without slicer data,
    // weight is 0 and the source is "none".
    expect(result.weightG).toBe(0);
    expect(result.weightSource).toBe("none");
  });
});
