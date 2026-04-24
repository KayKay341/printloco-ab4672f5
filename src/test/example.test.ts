import { describe, it, expect } from "vitest";
import { computeEstimate, DEFAULT_COST_INPUTS } from "@/components/CostEstimator";

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
});
