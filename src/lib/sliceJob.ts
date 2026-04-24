/**
 * In-browser slicer state model.
 *
 * A Job is one or more Plates. Each Plate has a build-plate model + a set of
 * Parts placed on it. Each Part references the original uploaded buffer plus
 * a transform that the user has applied (translate/rotate/scale). Slicing is
 * deferred — the user clicks "Slice plate" and we bake the transforms into a
 * single STL handed to Cura WASM.
 */

import * as THREE from "three";
import type { SliceResult } from "@/lib/stlSlicer";

export type PartKind = "stl" | "3mf";

export type PartTransform = {
  /** XY translation on the plate, mm (Z is locked to plate floor by lay-flat). */
  tx: number;
  ty: number;
  /** Rotation in degrees, applied X→Y→Z (intrinsic). */
  rotX: number;
  rotY: number;
  rotZ: number;
  /** Uniform scale multiplier. 1 = original. */
  scale: number;
};

export const IDENTITY_TRANSFORM: PartTransform = {
  tx: 0, ty: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1,
};

export type PartState = {
  id: string;
  fileName: string;
  kind: PartKind;
  /** Original file bytes (for 3MF this stays the source 3MF, not used in plate bake). */
  buffer: ArrayBuffer;
  /** Three geometry for live preview (NOT mutated by transform — preview applies it). */
  geometry: THREE.BufferGeometry;
  /** Untransformed bbox of the original mesh in its source units (mm after rescale). */
  baseBboxMm: { x: number; y: number; z: number };
  transform: PartTransform;
  color: string;
  /** Source-units of the original file (in if it's an inch-authored STL). */
  sourceUnits: "mm" | "in";
};

export type PlateState = {
  id: string;
  /** BUILD_PLATES preset id (e.g. "bambu-x1c"). */
  plateId: string;
  parts: PartState[];
  /** True whenever a setting or transform has changed since the last slice. */
  dirty: boolean;
  lastSlice: SliceResult | null;
  /** Per-part weight breakdown, only populated after a successful slice. */
  perPartWeightG?: Record<string, number>;
};

export function makePlate(plateId: string): PlateState {
  return {
    id: cryptoId(),
    plateId,
    parts: [],
    dirty: false,
    lastSlice: null,
  };
}

export function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Apply a part's transform to a Three geometry for preview. Returns a new geometry. */
export function previewGeometry(part: PartState): THREE.BufferGeometry {
  const g = part.geometry.clone();
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const center = new THREE.Vector3();
  bb.getCenter(center);
  // Center XY, drop to Z=0
  g.translate(-center.x, -center.y, -bb.min.z);

  // Apply scale around origin
  if (part.transform.scale !== 1) g.scale(part.transform.scale, part.transform.scale, part.transform.scale);

  // Rotate (X, then Y, then Z) — geometry is in slicer Z-up space here.
  const m = new THREE.Matrix4();
  const rx = (part.transform.rotX * Math.PI) / 180;
  const ry = (part.transform.rotY * Math.PI) / 180;
  const rz = (part.transform.rotZ * Math.PI) / 180;
  m.makeRotationFromEuler(new THREE.Euler(rx, ry, rz, "XYZ"));
  g.applyMatrix4(m);

  // Re-drop to plate after rotation
  g.computeBoundingBox();
  const bb2 = g.boundingBox!;
  g.translate(-((bb2.min.x + bb2.max.x) / 2), -((bb2.min.y + bb2.max.y) / 2), -bb2.min.z);

  // Translate to part position
  g.translate(part.transform.tx, part.transform.ty, 0);
  g.computeBoundingBox();
  g.computeVertexNormals();
  return g;
}

/** Bbox of a part after its transform is applied. */
export function transformedBbox(part: PartState): { min: THREE.Vector3; max: THREE.Vector3 } {
  const g = previewGeometry(part);
  const bb = g.boundingBox!;
  const out = { min: bb.min.clone(), max: bb.max.clone() };
  g.dispose();
  return out;
}

/** Returns part ids that overlap each other (XY AABB only). */
export function findCollisions(parts: PartState[]): Set<string> {
  const boxes = parts.map((p) => ({ id: p.id, b: transformedBbox(p) }));
  const hits = new Set<string>();
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].b, b = boxes[j].b;
      const xOverlap = a.min.x < b.max.x - 0.01 && b.min.x < a.max.x - 0.01;
      const yOverlap = a.min.y < b.max.y - 0.01 && b.min.y < a.max.y - 0.01;
      if (xOverlap && yOverlap) {
        hits.add(boxes[i].id);
        hits.add(boxes[j].id);
      }
    }
  }
  return hits;
}

/** True if any part of the plate's parts overflows the plate footprint. */
export function plateOverflow(parts: PartState[], plate: { x: number; y: number; z: number }): boolean {
  for (const p of parts) {
    const { min, max } = transformedBbox(p);
    const halfX = plate.x / 2;
    const halfY = plate.y / 2;
    if (min.x < -halfX - 0.5 || max.x > halfX + 0.5) return true;
    if (min.y < -halfY - 0.5 || max.y > halfY + 0.5) return true;
    if (max.z > plate.z + 0.5) return true;
  }
  return false;
}
