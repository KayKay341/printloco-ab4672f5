import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import type { BuildPlate } from "@/lib/buildPlates";

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

export type WeightSource =
  | "slicer-gcode"     // grams summed from extrusion moves in the produced G-code
  | "slicer-filament"  // slicer metadata reported a filament length
  | "slicer-material"  // slicer metadata reported a material volume
  | "none";

export type SliceResult = {
  geometry: THREE.BufferGeometry;
  /** Raw mesh volume mm³ — informational only, never used for pricing. */
  volumeMm3: number;
  /** Grams from the slicer (g-code first, metadata second). 0 = couldn't measure. */
  weightG: number;
  weightSource: WeightSource;
  printMinutes: number;
  /** Bounding box (mm) of the geometry actually sent to the slicer (after scale + units). */
  bbox: { x: number; y: number; z: number };
  triangles: number;
};

export type SliceOptions = {
  material: string;
  /** 0..100 */
  infillPct: number;
  layerHeightMm?: number;
  /** Filament diameter (mm). Defaults to 1.75. */
  filamentDiameterMm?: number;
  /** Optional exact density from the source slicer/profile. */
  materialDensityGPerCm3?: number;
  /** "in" → multiply incoming geometry by 25.4 before slicing. */
  sourceUnits?: "mm" | "in";
  /** 1 = 100%. Applied to geometry before slicing. */
  scale?: number;
  /** Walls/perimeter count (default 3). */
  walls?: number;
  /** Adds support generation. */
  supports?: boolean;
  /** Selected build plate (drives Cura machine_width/depth/height). */
  plate?: Pick<BuildPlate, "x" | "y" | "z">;
};

type CuraSliceMetadata = {
  printTime?: number;
  material1Usage?: number;
  material2Usage?: number;
  filamentUsage?: number;
};

let curaModulePromise: Promise<{ CuraWASM: new (config: any) => any }> | null = null;

/** Signed-tetrahedron volume → absolute mesh volume in mm³. */
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
 * Apply user-controlled scale + units to an STL by rewriting positions.
 * We do this BEFORE handing the buffer to the slicer so the slicer's
 * reported usage matches what the customer is being quoted on.
 */
function rescaleStlBuffer(buf: ArrayBuffer, factor: number): ArrayBuffer {
  if (factor === 1) return buf.slice(0);

  // Detect ASCII vs binary: ASCII STLs start with "solid " and contain "facet".
  const head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(256, buf.byteLength))).toLowerCase();
  const isAscii = head.startsWith("solid") && head.includes("facet");

  if (isAscii) {
    const text = new TextDecoder().decode(new Uint8Array(buf));
    const out = text.replace(
      /vertex\s+(-?[0-9.eE+-]+)\s+(-?[0-9.eE+-]+)\s+(-?[0-9.eE+-]+)/g,
      (_m, x, y, z) =>
        `vertex ${(Number(x) * factor).toFixed(6)} ${(Number(y) * factor).toFixed(6)} ${(Number(z) * factor).toFixed(6)}`,
    );
    return new TextEncoder().encode(out).buffer;
  }

  // Binary: 80-byte header + uint32 triCount + 50 bytes per triangle (normal + 3 verts + attr).
  const src = new DataView(buf);
  const out = new ArrayBuffer(buf.byteLength);
  new Uint8Array(out).set(new Uint8Array(buf));
  const dst = new DataView(out);
  const triCount = src.getUint32(80, true);
  let off = 84;
  for (let i = 0; i < triCount; i++) {
    // Skip normal (3 floats), then scale 3 vertices (9 floats).
    off += 12;
    for (let j = 0; j < 9; j++) {
      const cur = src.getFloat32(off, true);
      dst.setFloat32(off, cur * factor, true);
      off += 4;
    }
    off += 2; // attribute byte count
  }
  return out;
}

/**
 * Loads STL geometry and reports bbox / volume for display only.
 * Weight is intentionally NOT derived here — grams must come from the slicer.
 */
export function sliceStlBuffer(buf: ArrayBuffer, _opts: { material: string; infillPct: number }): SliceResult {
  const loader = new STLLoader();
  const geometry = loader.parse(buf);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const volMm3 = meshVolumeMm3(geometry);
  const bbox = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  return {
    geometry,
    volumeMm3: volMm3,
    weightG: 0,
    weightSource: "none",
    printMinutes: 0,
    bbox: { x: size.x, y: size.y, z: size.z },
    triangles: (geometry.getAttribute("position").count) / 3,
  };
}

/**
 * Real-slice path: rescale STL to user units + scale, configure Cura with the
 * selected machine plate, and derive grams from the produced G-code.
 */
export async function sliceStlBufferAccurate(buf: ArrayBuffer, opts: SliceOptions): Promise<SliceResult> {
  const unitFactor = opts.sourceUnits === "in" ? 25.4 : 1;
  const userScale = Math.max(0.1, Math.min(5, opts.scale ?? 1));
  const factor = unitFactor * userScale;

  const scaledBuf = rescaleStlBuffer(buf, factor);
  const fallback = sliceStlBuffer(scaledBuf, opts);

  try {
    const { CuraWASM } = await loadCuraModule();
    const overrides = buildOverrides(opts);

    const slicer = new CuraWASM({
      transfer: false,
      verbose: false,
      overrides,
    });

    try {
      const { gcode, metadata } = await slicer.slice(scaledBuf.slice(0), "stl");
      return toSliceResult(fallback, gcode, metadata, opts);
    } finally {
      try {
        await slicer.destroy?.();
      } catch {
        /* best-effort */
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

function buildOverrides(opts: SliceOptions): Array<{ scope?: string; key: string; value: string }> {
  const layer = Math.max(0.04, opts.layerHeightMm ?? 0.2);
  const infill = Math.max(0, Math.min(100, opts.infillPct));
  const walls = Math.max(1, Math.min(8, opts.walls ?? 3));
  const supports = !!opts.supports;
  const plate = opts.plate;

  const list: Array<{ scope?: string; key: string; value: string }> = [
    { key: "infill_sparse_density", value: String(infill) },
    { key: "layer_height", value: String(layer) },
    { key: "wall_line_count", value: String(walls) },
    { key: "support_enable", value: supports ? "true" : "false" },
  ];

  if (plate) {
    list.push(
      { key: "machine_width", value: String(plate.x) },
      { key: "machine_depth", value: String(plate.y) },
      { key: "machine_height", value: String(plate.z) },
    );
  }
  return list;
}

function toSliceResult(
  base: SliceResult,
  gcode: ArrayBuffer | string | null | undefined,
  metadata: CuraSliceMetadata | null | undefined,
  opts: SliceOptions,
): SliceResult {
  const fromGcode = gcode ? gramsFromGcode(gcode, opts) : null;

  if (fromGcode && fromGcode.weightG > 0) {
    return {
      ...base,
      weightG: fromGcode.weightG,
      weightSource: "slicer-gcode",
      printMinutes: fromGcode.printMinutes ?? metadataMinutes(metadata) ?? base.printMinutes,
    };
  }

  const resolved = resolveWeightFromMetadata(metadata ?? {}, opts);
  return {
    ...base,
    weightG: resolved.weightG,
    weightSource: resolved.source,
    printMinutes: metadataMinutes(metadata) ?? base.printMinutes,
  };
}

function metadataMinutes(metadata: CuraSliceMetadata | null | undefined): number | undefined {
  if (!metadata?.printTime || metadata.printTime <= 0) return undefined;
  return metadata.printTime / 60;
}

/**
 * Parse extrusion (E-axis) from generated G-code and convert filament length
 * → grams using filament diameter + material density. This is the SOURCE OF
 * TRUTH because it's what the printer would actually push regardless of
 * ambiguous metadata fields.
 */
export function gramsFromGcode(
  gcode: ArrayBuffer | string,
  opts: SliceOptions,
): { weightG: number; printMinutes?: number } | null {
  let text: string;
  if (typeof gcode === "string") text = gcode;
  else {
    try { text = new TextDecoder().decode(new Uint8Array(gcode)); } catch { return null; }
  }

  let absoluteE = true; // M82 = absolute (default), M83 = relative
  let lastE = 0;
  let totalMm = 0;
  let timeSec = 0;

  // Quick scan — split on newlines, ignore comments after ';'.
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(";")) {
      // Cura sometimes embeds "TIME:1234" or ";TIME:1234"
      const t = /TIME:\s*([0-9.]+)/i.exec(line);
      if (t) timeSec = Math.max(timeSec, Number(t[1]));
      continue;
    }
    const code = line.split(";")[0].trim();
    if (code === "M82") { absoluteE = true; lastE = 0; continue; }
    if (code === "M83") { absoluteE = false; continue; }
    if (/^G92\b/.test(code)) {
      const m = /E(-?[0-9.]+)/.exec(code);
      if (m) lastE = Number(m[1]);
      continue;
    }
    if (/^G[01]\b/.test(code)) {
      const m = /E(-?[0-9.]+)/.exec(code);
      if (!m) continue;
      const e = Number(m[1]);
      if (!Number.isFinite(e)) continue;
      if (absoluteE) {
        const delta = e - lastE;
        if (delta > 0) totalMm += delta;
        lastE = e;
      } else {
        if (e > 0) totalMm += e;
      }
    }
  }

  if (totalMm <= 0) return null;

  const density = resolveDensity(opts);
  const diameter = opts.filamentDiameterMm ?? 1.75;
  const weightG = filamentLengthMmToWeightG(totalMm, diameter, density);
  return { weightG, printMinutes: timeSec > 0 ? timeSec / 60 : undefined };
}

function resolveWeightFromMetadata(
  metadata: CuraSliceMetadata,
  opts: SliceOptions,
): { weightG: number; source: WeightSource } {
  const density = resolveDensity(opts);
  const diameter = opts.filamentDiameterMm ?? 1.75;

  const fromFilament = filamentLengthMmToWeightG(metadata.filamentUsage ?? 0, diameter, density);
  if (fromFilament > 0) return { weightG: fromFilament, source: "slicer-filament" };

  const materialVolumeMm3 = (metadata.material1Usage ?? 0) + (metadata.material2Usage ?? 0);
  const fromMaterial = materialVolumeMm3ToWeightG(materialVolumeMm3, density);
  if (fromMaterial > 0) return { weightG: fromMaterial, source: "slicer-material" };

  return { weightG: 0, source: "none" };
}

function resolveDensity(opts: SliceOptions): number {
  if (Number.isFinite(opts.materialDensityGPerCm3) && (opts.materialDensityGPerCm3 ?? 0) > 0) {
    return opts.materialDensityGPerCm3!;
  }
  return MATERIAL_DENSITY[opts.material] ?? MATERIAL_DENSITY.PLA;
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
