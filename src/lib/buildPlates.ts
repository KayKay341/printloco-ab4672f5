/**
 * Build plate presets used by the upload flow. Sizes are interior usable
 * volume in mm. Keep aligned with `printer_presets.build_volume` so we can
 * cross-reference real makers' machines.
 */

export type BuildPlate = {
  id: string;
  brand: string;
  model: string;
  /** Short label shown in the picker (e.g. "X1C"). */
  short: string;
  /** Usable build volume in millimeters. */
  x: number;
  y: number;
  z: number;
};

export const BUILD_PLATES: BuildPlate[] = [
  { id: "bambu-x1c",     brand: "Bambu Lab", model: "X1 Carbon", short: "X1C",      x: 256, y: 256, z: 256 },
  { id: "bambu-p1s",     brand: "Bambu Lab", model: "P1S",       short: "P1S",      x: 256, y: 256, z: 256 },
  { id: "bambu-p1p",     brand: "Bambu Lab", model: "P1P",       short: "P1P",      x: 256, y: 256, z: 256 },
  { id: "bambu-a1",      brand: "Bambu Lab", model: "A1",        short: "A1",       x: 256, y: 256, z: 256 },
  { id: "bambu-a1-mini", brand: "Bambu Lab", model: "A1 Mini",   short: "A1 mini",  x: 180, y: 180, z: 180 },
  { id: "bambu-h2d",     brand: "Bambu Lab", model: "H2D",       short: "H2D",      x: 350, y: 320, z: 325 },
  { id: "prusa-mk4",     brand: "Prusa",     model: "MK4",       short: "MK4",      x: 250, y: 210, z: 220 },
  { id: "prusa-xl",      brand: "Prusa",     model: "XL",        short: "XL",       x: 360, y: 360, z: 360 },
  { id: "voron-2.4-300", brand: "Voron",     model: "2.4 (300)", short: "Voron",    x: 300, y: 300, z: 300 },
  { id: "ender-3",       brand: "Creality",  model: "Ender 3",   short: "Ender 3",  x: 220, y: 220, z: 250 },
];

export const DEFAULT_PLATE_ID = "bambu-x1c";

export function getPlate(id: string): BuildPlate {
  return BUILD_PLATES.find((p) => p.id === id) ?? BUILD_PLATES[0];
}

export type FitStatus = "fits" | "tight" | "too-large";

export type FitResult = {
  status: FitStatus;
  /** Largest dimension utilization 0..1+ (>1 means overflow). */
  utilization: number;
  reason: string;
};

/**
 * Compare a model's bounding box (mm) against a plate. We don't currently
 * auto-rotate — caller can swap X/Y if they want to test orientation.
 */
export function checkFit(bboxMm: { x: number; y: number; z: number }, plate: BuildPlate): FitResult {
  const ux = bboxMm.x / plate.x;
  const uy = bboxMm.y / plate.y;
  const uz = bboxMm.z / plate.z;
  const u = Math.max(ux, uy, uz);

  if (u > 1.001) {
    const axes: string[] = [];
    if (ux > 1) axes.push(`X +${Math.round((ux - 1) * 100)}%`);
    if (uy > 1) axes.push(`Y +${Math.round((uy - 1) * 100)}%`);
    if (uz > 1) axes.push(`Z +${Math.round((uz - 1) * 100)}%`);
    return { status: "too-large", utilization: u, reason: `Overflows ${axes.join(", ")}` };
  }
  if (u > 0.95) {
    return { status: "tight", utilization: u, reason: "Borderline — within 5% of plate edge" };
  }
  return { status: "fits", utilization: u, reason: "Fits comfortably" };
}

/** Parse "256x256x256mm" / "350 × 320 × 325 mm" → BuildPlate-shaped dims. */
export function parseBuildVolume(s: string | null | undefined): { x: number; y: number; z: number } | null {
  if (!s) return null;
  const parts = s.split(/[xX×]/).map((p) => Number(p.replace(/[^0-9.]/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
  if (parts.length < 3) return null;
  return { x: parts[0], y: parts[1], z: parts[2] };
}
