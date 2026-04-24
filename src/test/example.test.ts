import { describe, it, expect } from "vitest";
import { computeEstimate, DEFAULT_COST_INPUTS } from "@/components/CostEstimator";
import { sliceStlBuffer, gramsFromGcode, MATERIAL_DENSITY } from "@/lib/stlSlicer";
import { checkFit, getPlate, parseBuildVolume } from "@/lib/buildPlates";
import { bakeStl, mergeBinaryStls, bboxOfStl } from "@/lib/stlTransform";

describe("CostEstimator math", () => {
  it("multiplies slicer grams by quantity, never inflates by scale^3", () => {
    const base = { weightG: 50, printMinutes: 120, bboxMm: { x: 100, y: 50, z: 25 } };
    const single = computeEstimate(base, { ...DEFAULT_COST_INPUTS, quantity: 1 });
    const ten = computeEstimate(base, { ...DEFAULT_COST_INPUTS, quantity: 10 });
    expect(ten.weightG).toBeCloseTo(single.weightG * 10, 5);
    expect(ten.printMinutes).toBeCloseTo(single.printMinutes * 10, 5);
  });

  it("display units do not change pricing", () => {
    const base = { weightG: 50, printMinutes: 120, bboxMm: { x: 100, y: 50, z: 25 } };
    const mm = computeEstimate(base, { ...DEFAULT_COST_INPUTS, units: "mm" });
    const inches = computeEstimate(base, { ...DEFAULT_COST_INPUTS, units: "in" });
    expect(inches.amountCents).toBe(mm.amountCents);
    expect(inches.weightG).toBeCloseTo(mm.weightG, 5);
  });

  it("returns 0 when slicer couldn't measure", () => {
    const out = computeEstimate(
      { weightG: 0, printMinutes: 0, bboxMm: { x: 10, y: 10, z: 10 } },
      DEFAULT_COST_INPUTS,
    );
    expect(out.weightG).toBe(0);
    expect(out.amountCents).toBe(0);
  });
});

describe("STL parsing", () => {
  it("returns geometry + bbox without inflating weight", () => {
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
endsolid cube`).buffer;

    const result = sliceStlBuffer(asciiStl, { material: "PLA", infillPct: 20 });
    expect(result.bbox.x).toBeCloseTo(10, 5);
    expect(result.weightG).toBe(0);
    expect(result.weightSource).toBe("none");
  });
});

describe("gramsFromGcode", () => {
  it("sums absolute extrusion and converts to grams", () => {
    const g = `M82\nG1 X0 E0\nG1 X10 E100\nG1 X20 E300\n`;
    const out = gramsFromGcode(g, { material: "PLA", infillPct: 20 });
    expect(out).not.toBeNull();
    // 300mm of 1.75mm filament: π*(0.875)^2 * 300 mm³ ≈ 721.6 mm³ → /1000 * 1.24 ≈ 0.895 g
    const expected = (Math.PI * 0.875 * 0.875 * 300 / 1000) * MATERIAL_DENSITY.PLA;
    expect(out!.weightG).toBeCloseTo(expected, 3);
  });

  it("returns null when no extrusion present", () => {
    expect(gramsFromGcode(`G1 X10\nG1 Y20\n`, { material: "PLA", infillPct: 20 })).toBeNull();
  });
});

describe("Build plate fit", () => {
  it("fits a small part on the X1C plate", () => {
    const plate = getPlate("bambu-x1c");
    expect(checkFit({ x: 50, y: 50, z: 50 }, plate).status).toBe("fits");
  });

  it("flags overflow on the A1 mini plate", () => {
    const plate = getPlate("bambu-a1-mini");
    const fit = checkFit({ x: 200, y: 100, z: 100 }, plate);
    expect(fit.status).toBe("too-large");
    expect(fit.utilization).toBeGreaterThan(1);
  });

  it("parses build_volume strings from maker presets", () => {
    expect(parseBuildVolume("256x256x256mm")).toEqual({ x: 256, y: 256, z: 256 });
    expect(parseBuildVolume("350 × 320 × 325 mm")).toEqual({ x: 350, y: 320, z: 325 });
    expect(parseBuildVolume(null)).toBeNull();
  });
});
