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

export type SliceResult = {
  geometry: THREE.BufferGeometry;
  volumeCm3: number;       // raw mesh volume
  weightG: number;         // adjusted for infill + shell
  printMinutes: number;
  bbox: { x: number; y: number; z: number }; // mm
  triangles: number;
};

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
export function sliceStlBuffer(buf: ArrayBuffer, opts: {
  material: string;
  infillPct: number; // 0..100
}): SliceResult {
  const loader = new STLLoader();
  const geometry = loader.parse(buf);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const volMm3 = meshVolumeMm3(geometry);
  const volCm3 = volMm3 / 1000;

  // Effective material model:
  //   shell ~15% of bounding shell as solid wall + interior at infill density.
  // For simplicity, treat the "solid skin" as 25% solid baseline plus
  // the rest scaled by infill.
  const infill = Math.max(0, Math.min(100, opts.infillPct)) / 100;
  const effectiveSolid = 0.25 + 0.75 * infill;
  const adjVolCm3 = volCm3 * effectiveSolid;

  const density = MATERIAL_DENSITY[opts.material] ?? MATERIAL_DENSITY.PLA;
  const weightG = adjVolCm3 * density;

  // FDM volumetric flow rate ~10 mm^3/s typical; assume 7 for safety w/ travel moves.
  // Time = effective_volume_mm3 / 7 mm^3/s, then add 60s base.
  const printSeconds = (adjVolCm3 * 1000) / 7 + 60;
  const printMinutes = printSeconds / 60;

  const bbox = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);

  return {
    geometry,
    volumeCm3: volCm3,
    weightG,
    printMinutes,
    bbox: { x: size.x, y: size.y, z: size.z },
    triangles: (geometry.getAttribute("position").count) / 3,
  };
}
