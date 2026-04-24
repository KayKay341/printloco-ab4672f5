import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

// Material densities g/cm^3
export const MATERIAL_DENSITY: Record<string, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  TPU: 1.21,
  Nylon: 1.14,
  Resin: 1.15,
};

// Reference per-gram price used for the customer's instant quote (makers override).
export const MATERIAL_BASE_PRICE: Record<string, number> = {
  PLA: 0.2,
  PETG: 0.25,
  ABS: 0.25,
  TPU: 0.45,
  Nylon: 0.6,
  Resin: 0.8,
};

export type WeightSource = "slicer-filament" | "slicer-material" | "none";

export type SliceResult = {
  geometry: THREE.BufferGeometry;
  volumeCm3: number;       // raw mesh volume (informational only)
  weightG: number;         // grams from slicer-reported usage; 0 if unavailable
  weightSource: WeightSource;
  printMinutes: number;
  bbox: { x: number; y: number; z: number }; // mm
  triangles: number;
};

type SliceOptions = {
  material: string;
  infillPct: number;
  layerHeightMm?: number;
  filamentDiameterMm?: number;
};

type CuraSliceMetadata = {
  printTime?: number;
  material1Usage?: number;
  material2Usage?: number;
  filamentUsage?: number;
};

let curaModulePromise: Promise<{ CuraWASM: new (config: any) => any }> | null = null;

/**
 * Compute signed volume of a triangle mesh.
 * Sum of signed tetrahedron volumes from origin -> triangle vertices.
 */
function meshVolumeMm3(geom: THREE.BufferGeometry): number {
  const pos = geom.getAttribute("position");
  if (!pos) return 0;
  const arr = pos.array as Float32Array;
  let v = 0;
  for (let i = 0; i < arr.length; i += 9) {
    const ax = arr[i], ay = arr[i + 1], az = arr[i + 2];
    const bx = arr[i + 3], by = arr[i + 4], bz = arr[i + 5];
    const cx = arr[i + 6], cy = arr[i + 7], cz = arr[i + 8];
    v += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6;
  }
  return Math.abs(v);
}

/**
 * Browser-side "slicer" — loads STL, computes solid mesh volume in mm^3,
 * applies an infill model (perimeter shell solid + interior * infill density),
 * and converts to grams using material density. Print time uses a calibrated
 * volumetric flow rate (mm^3/s) typical for FDM.
 */
/**
 * Loads STL geometry and reports bbox / volume for display only.
 * Weight is intentionally NOT derived here — grams must come from the slicer.
 */
export function sliceStlBuffer(buf: ArrayBuffer, _opts: {
  material: string;
  infillPct: number; // 0..100
}): SliceResult {
  const loader = new STLLoader();
  const geometry = loader.parse(buf);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const volMm3 = meshVolumeMm3(geometry);
  const volCm3 = volMm3 / 1000;

  const bbox = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  return {
    geometry,
    volumeCm3: volCm3,
    weightG: 0,
    weightSource: "none",
    printMinutes: 0,
    bbox: { x: size.x, y: size.y, z: size.z },
    triangles: (geometry.getAttribute("position").count) / 3,
  };
}

/**
 * Higher-accuracy path: use Cura WASM when available for print time + filament
 * length, then convert the returned filament length into grams. Falls back to
 * geometry-based estimation if the slicer is unavailable or errors.
 */
export async function sliceStlBufferAccurate(buf: ArrayBuffer, opts: SliceOptions): Promise<SliceResult> {
  const fallback = sliceStlBuffer(buf, opts);

  try {
    const { CuraWASM } = await loadCuraModule();
    const slicer = new CuraWASM({
      transfer: false,
      verbose: false,
      overrides: [
        { key: "infill_sparse_density", value: String(Math.max(0, Math.min(100, opts.infillPct))) },
        { key: "layer_height", value: String(Math.max(0.04, opts.layerHeightMm ?? 0.2)) },
      ],
    });

    try {
      const { metadata } = await slicer.slice(buf.slice(0), "stl");
      const sliced = toSliceResult(fallback, metadata, opts);
      return sliced;
    } finally {
      try {
        await slicer.destroy?.();
      } catch {
        // Best-effort cleanup only.
      }
    }
  } catch {
    return fallback;
  }
}

async function loadCuraModule() {
  if (!curaModulePromise) {
    curaModulePromise = import("cura-wasm") as Promise<{ CuraWASM: new (config: any) => any }>;
  }
  return curaModulePromise;
}

function toSliceResult(base: SliceResult, metadata: CuraSliceMetadata | null | undefined, opts: SliceOptions): SliceResult {
  if (!metadata) return base;

  const resolved = resolveWeightFromMetadata(metadata, opts);
  const printMinutes = metadata.printTime && metadata.printTime > 0 ? metadata.printTime / 60 : base.printMinutes;

  return {
    ...base,
    weightG: resolved.weightG,
    weightSource: resolved.source,
    printMinutes,
  };
}

/**
 * Strictly derive grams from slicer-reported usage:
 *   1. Prefer filament length (mm) → cylinder volume × material density.
 *   2. Otherwise use slicer-reported material volume(s) (mm^3) × density.
 * If the slicer returns nothing usable, weight is 0 and source is "none" —
 * we never fall back to raw mesh volume.
 */
function resolveWeightFromMetadata(
  metadata: CuraSliceMetadata,
  opts: SliceOptions,
): { weightG: number; source: WeightSource } {
  const density = MATERIAL_DENSITY[opts.material] ?? MATERIAL_DENSITY.PLA;
  const diameter = opts.filamentDiameterMm ?? 1.75;

  const fromFilament = filamentLengthMmToWeightG(metadata.filamentUsage ?? 0, diameter, density);
  if (fromFilament > 0) {
    return { weightG: fromFilament, source: "slicer-filament" };
  }

  const materialVolumeMm3 = (metadata.material1Usage ?? 0) + (metadata.material2Usage ?? 0);
  const fromMaterial = materialVolumeMm3ToWeightG(materialVolumeMm3, density);
  if (fromMaterial > 0) {
    return { weightG: fromMaterial, source: "slicer-material" };
  }

  return { weightG: 0, source: "none" };
}

function filamentLengthMmToWeightG(lengthMm: number, diameterMm: number, densityGPerCm3: number): number {
  if (!Number.isFinite(lengthMm) || lengthMm <= 0) return 0;
  const radiusMm = diameterMm / 2;
  const areaMm2 = Math.PI * radiusMm * radiusMm;
  const volumeMm3 = areaMm2 * lengthMm;
  return (volumeMm3 / 1000) * densityGPerCm3;
}

function materialVolumeMm3ToWeightG(volumeMm3: number, densityGPerCm3: number): number {
  if (!Number.isFinite(volumeMm3) || volumeMm3 <= 0) return 0;
  return (volumeMm3 / 1000) * densityGPerCm3;
}
