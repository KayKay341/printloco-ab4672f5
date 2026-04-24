import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import * as THREE from "three";

export type FilamentSlot = {
  index: number;       // 1-based slot index as referenced inside the 3MF
  hex: string;         // assigned color
  type: string;        // material type (PLA, PETG…)
  name?: string;       // optional human label (e.g. "Bambu PLA Basic Red")
};

export type Mfg3mfResult = {
  geometry: THREE.BufferGeometry;
  /** RGB color attribute on the geometry (one per vertex) — used for multi-color preview. */
  hasVertexColors: boolean;
  filaments: FilamentSlot[];
  /** Estimated weight per slot (grams). Sum may differ from total if some slots unused. */
  weightPerSlot: number[];
  totalWeightG: number;
  /** Estimated print minutes parsed from embedded slicer metadata when present. */
  printMinutes: number;
  bbox: { x: number; y: number; z: number };
  triangles: number;
};

const FALLBACK_PALETTE = [
  "#E63946", "#1D4ED8", "#16A34A", "#FACC15",
  "#F97316", "#9333EA", "#EC4899", "#06B6D4",
  "#111111", "#F5F5F5", "#6B7280", "#D4AF37",
  "#22C55E", "#0EA5E9", "#A855F7", "#F43F5E",
];

// Materials density (g/cm^3) — keep aligned with stlSlicer.
const DENSITY: Record<string, number> = {
  PLA: 1.24, PETG: 1.27, ABS: 1.04, TPU: 1.21, Nylon: 1.14, Resin: 1.15,
};

/**
 * Parse a Bambu / Orca .3mf file:
 *   - reads 3D/3dmodel.model (3MF mesh + per-triangle paint_color when present)
 *   - reads Metadata/project_settings.config for filament/extruder mapping
 * Returns a single merged geometry with vertex colors set per face based on
 * the assigned filament slot, plus the slot list for the buyer to remap.
 */
type ObjectRec = {
  id: string;
  extruder: number;
  mesh?: any;
  components?: { objectid: string; path?: string; transform?: number[] }[];
  /** Source model file path inside the zip (so component refs resolve correctly). */
  sourcePath: string;
};

export async function parse3mf(buf: ArrayBuffer): Promise<Mfg3mfResult> {
  const zip = await JSZip.loadAsync(buf);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    allowBooleanAttributes: true,
    parseAttributeValue: false,
  });

  // Find the root model. Try the standard path, then fall back to any .model.
  const rootEntry =
    zip.file("3D/3dmodel.model") ||
    zip.file(/3D\/.*\.model$/i)?.[0] ||
    zip.file(/.*\.model$/i)?.[0] ||
    null;
  if (!rootEntry) throw new Error("Not a valid 3MF — no .model file found");

  // Load every .model file in the zip — Bambu/Orca split each object into
  // its own file under 3D/Objects/ and reference them from the root via
  // <component p:path="..." objectid="..."/>.
  const modelFiles = new Map<string, any>(); // normalized path -> parsed doc
  const allModelEntries = zip.file(/.*\.model$/i) ?? [];
  for (const entry of allModelEntries) {
    try {
      const txt = await entry.async("string");
      modelFiles.set(normalizePath(entry.name), parser.parse(txt));
    } catch {
      // skip unreadable
    }
  }

  const rootPath = normalizePath(rootEntry.name);
  const rootDoc = modelFiles.get(rootPath);
  if (!rootDoc?.model) throw new Error("3MF root model is unreadable");

  // Index every object across every model file by `${path}#${id}`.
  const objects = new Map<string, ObjectRec>();
  for (const [path, doc] of modelFiles.entries()) {
    const objs = asArray(doc?.model?.resources?.object);
    for (const obj of objs) {
      const id = String(obj.id ?? "");
      if (!id) continue;
      objects.set(`${path}#${id}`, {
        id,
        extruder: Number(obj.extruder ?? obj.pid ?? 1) || 1,
        mesh: obj.mesh,
        components: asArray(obj.components?.component).map((c: any) => ({
          objectid: String(c.objectid ?? ""),
          path: c.path ?? c["p:path"],
          transform: parseTransform(c.transform),
        })),
        sourcePath: path,
      });
    }
  }

  const filaments = await readFilaments(zip);
  const embeddedMeta = await readEmbeddedSliceMeta(zip, filaments);

  const positions: number[] = [];
  const colors: number[] = [];
  const slotVolumeMm3: number[] = new Array(Math.max(1, filaments.length)).fill(0);

  // Walk the build items — each one references a top-level object that may be
  // a mesh or a tree of components pointing to meshes in other .model files.
  const buildItems = asArray(rootDoc.model.build?.item);
  const itemsToProcess = buildItems.length
    ? buildItems.map((it: any) => ({
        objectid: String(it.objectid ?? ""),
        path: it.path ?? it["p:path"],
        transform: parseTransform(it.transform),
      }))
    : // No <build> — fall back to every object that has an inline mesh.
      Array.from(objects.values())
        .filter((o) => hasInlineMesh(o.mesh))
        .map((o) => ({ objectid: o.id, path: o.sourcePath, transform: undefined }));

  const visit = (
    objectid: string,
    refPath: string | undefined,
    parentXform: number[] | undefined,
    parentExtruder: number,
  ) => {
    if (!objectid) return;
    const lookupPath = refPath ? resolvePath(refPath, rootPath) : rootPath;
    const rec =
      objects.get(`${lookupPath}#${objectid}`) ||
      // Fallback: same id in any file (some exporters drop the path attr).
      Array.from(objects.values()).find((o) => o.id === objectid);
    if (!rec) return;

    const extruder = rec.extruder || parentExtruder;

    if (hasInlineMesh(rec.mesh)) {
      emitMesh(rec.mesh, parentXform, extruder);
      return;
    }
    for (const comp of rec.components ?? []) {
      const childXform = composeTransform(parentXform, comp.transform);
      visit(comp.objectid, comp.path ?? rec.sourcePath, childXform, extruder);
    }
  };

  const emitMesh = (mesh: any, xform: number[] | undefined, defaultExtruder: number) => {
    const verts = asArray(mesh.vertices.vertex).map((v: any) => {
      const p = [Number(v.x), Number(v.y), Number(v.z)];
      return xform ? applyTransform(xform, p) : p;
    });
    const tris = asArray(mesh.triangles.triangle);
    const defaultSlot = clampSlot(defaultExtruder, filaments.length);

    for (const t of tris) {
      const a = verts[Number(t.v1)];
      const b = verts[Number(t.v2)];
      const c = verts[Number(t.v3)];
      if (!a || !b || !c) continue;

      const paint = String(t.paint_color ?? t.mmu_ga ?? "").trim();
      const slot = paint
        ? clampSlot(parsePaintSlot(paint), filaments.length)
        : defaultSlot;

      const hex = filaments[slot - 1]?.hex ?? FALLBACK_PALETTE[(slot - 1) % FALLBACK_PALETTE.length];
      const col = hexToRgb(hex);

      positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      colors.push(col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b);

      while (slotVolumeMm3.length < slot) slotVolumeMm3.push(0);
      slotVolumeMm3[slot - 1] += Math.abs(signedTetVolume(a, b, c));
    }
  };

  for (const item of itemsToProcess) {
    visit(item.objectid, item.path, item.transform, 1);
  }

  if (positions.length === 0) {
    throw new Error("3MF contains no mesh geometry we can render");
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const bb = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);

  // Convert to grams. Use slot's filament type density when available; else PLA.
  // Apply same effective-solid heuristic as the STL slicer (treat as 35% — already
  // sliced/oriented model so a bit denser than raw STL).
  const EFFECTIVE_SOLID = 0.35;
  const weightPerSlot = slotVolumeMm3.map((mm3, idx) => {
    const cm3 = (mm3 / 1000) * EFFECTIVE_SOLID;
    const type = filaments[idx]?.type ?? "PLA";
    return cm3 * (DENSITY[type] ?? DENSITY.PLA);
  });
  const totalWeightFromGeometryG = weightPerSlot.reduce((a, b) => a + b, 0);
  const totalWeightG = embeddedMeta.totalWeightG ?? totalWeightFromGeometryG;
  const normalizedWeightPerSlot =
    embeddedMeta.weightPerSlot?.length
      ? padWeights(embeddedMeta.weightPerSlot, Math.max(embeddedMeta.weightPerSlot.length, slotVolumeMm3.length))
      : weightPerSlot;

  // Pad filaments to match observed slot count if XML referenced a slot we
  // didn't read settings for.
  while (filaments.length < slotVolumeMm3.length) {
    const idx = filaments.length;
    filaments.push({
      index: idx + 1,
      hex: FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length],
      type: "PLA",
    });
  }

  return {
    geometry,
    hasVertexColors: true,
    filaments,
    weightPerSlot: normalizedWeightPerSlot,
    totalWeightG,
    printMinutes: embeddedMeta.printMinutes ?? estimatePrintMinutesFromGeometry(size, totalWeightG),
    bbox: { x: size.x, y: size.y, z: size.z },
    triangles: positions.length / 9,
  };
}

/** Re-color an existing parsed geometry by remapping slot -> new hex array. */
export function recolorBySlot(
  geometry: THREE.BufferGeometry,
  filamentsBefore: FilamentSlot[],
  filamentsAfter: FilamentSlot[],
) {
  const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!colorAttr) return;
  // Build a lookup from old hex -> new hex (slot index aligned).
  const map = new Map<string, string>();
  for (let i = 0; i < filamentsBefore.length; i++) {
    const before = filamentsBefore[i].hex.toLowerCase();
    const after = filamentsAfter[i]?.hex ?? before;
    map.set(before, after);
  }
  for (let i = 0; i < colorAttr.count; i++) {
    const r = Math.round(colorAttr.getX(i) * 255);
    const g = Math.round(colorAttr.getY(i) * 255);
    const b = Math.round(colorAttr.getZ(i) * 255);
    const key = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
    const next = map.get(key);
    if (next) {
      const c = hexToRgb(next);
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
  }
  colorAttr.needsUpdate = true;
}

// ---- helpers ----

async function readFilaments(zip: JSZip): Promise<FilamentSlot[]> {
  // Bambu / Orca: Metadata/project_settings.config is JSON with filament_colour[]
  const candidates = [
    "Metadata/project_settings.config",
    "Metadata/model_settings.config",
    "Metadata/slice_info.config",
  ];
  for (const path of candidates) {
    const f = zip.file(path);
    if (!f) continue;
    try {
      const text = await f.async("string");
      // Some configs are JSON, some are XML. Try JSON first.
      try {
        const json = JSON.parse(text);
        const colors = asArray(json.filament_colour ?? json.filament_colors ?? []);
        const types = asArray(json.filament_type ?? []);
        if (colors.length) {
          return colors.map((c: any, i: number) => ({
            index: i + 1,
            hex: normalizeHex(String(c)),
            type: String(types[i] ?? "PLA").toUpperCase(),
          }));
        }
      } catch {
        // Try XML — slice_info.config is XML
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
        const xml = parser.parse(text);
        const filaments = asArray(xml?.config?.plate?.filament ?? xml?.plate?.filament ?? []);
        if (filaments.length) {
          return filaments.map((fl: any, i: number) => ({
            index: Number(fl.id ?? i + 1),
            hex: normalizeHex(String(fl.color ?? FALLBACK_PALETTE[i % FALLBACK_PALETTE.length])),
            type: String(fl.type ?? "PLA").toUpperCase(),
          }));
        }
      }
    } catch {
      // ignore and try next
    }
  }
  return [];
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function clampSlot(n: number, count: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  if (count > 0 && n > count) return count;
  return Math.floor(n);
}

async function readEmbeddedSliceMeta(zip: JSZip, filaments: FilamentSlot[]): Promise<{
  printMinutes?: number;
  totalWeightG?: number;
  weightPerSlot?: number[];
}> {
  const files = zip.file(/metadata\/plate_.*\.gcode$/i) ?? [];
  for (const file of files) {
    try {
      const text = await file.async("string");
      const meta = parseGcodeMetadata(text, filaments);
      if (meta.printMinutes || meta.totalWeightG || meta.weightPerSlot?.length) return meta;
    } catch {
      // ignore invalid embedded gcode
    }
  }
  return {};
}

function parseGcodeMetadata(text: string, filaments: FilamentSlot[]) {
  const compact = text.slice(0, 20000);
  const printMinutes =
    parseDurationToMinutes(matchValue(compact, /(?:total estimated time|estimated printing time(?: \(normal mode\))?|model printing time)\s*[:=]\s*([^;\n\r]+)/i)) ??
    parseDurationToMinutes(matchValue(compact, /HEADER_BLOCK_START.*?total estimated time\s*[:=]\s*([^;\n\r]+)/is));

  const totalWeightG =
    parseNumber(matchValue(compact, /filament used \[g\]\s*[:=]\s*([0-9.]+)/i)) ??
    parseNumber(matchValue(compact, /total filament used \[g\]\s*[:=]\s*([0-9.]+)/i));

  const weightPerSlot = parsePerSlotWeights(compact, filaments.length);
  return { printMinutes, totalWeightG, weightPerSlot };
}

function parsePerSlotWeights(text: string, slotCount: number): number[] {
  const out: number[] = [];
  const patterns = [
    /filament used \[g\]\s*(?:\(tool\s*(\d+)\)|\[t(\d+)\]|\[(\d+)\])?\s*[:=]\s*([0-9.]+)/gi,
    /total filament used \[g\]\s*(?:\(tool\s*(\d+)\)|\[t(\d+)\]|\[(\d+)\])?\s*[:=]\s*([0-9.]+)/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const rawIndex = match[1] ?? match[2] ?? match[3];
      const value = Number(match[4]);
      if (!Number.isFinite(value)) continue;
      const idx = rawIndex != null ? Math.max(0, Number(rawIndex)) : out.length;
      out[idx] = value;
    }
  }

  if (!out.length) return [];
  return padWeights(out, Math.max(slotCount, out.length));
}

function padWeights(weights: number[], len: number): number[] {
  const out = Array.from({ length: len }, (_, i) => weights[i] ?? 0);
  return out;
}

function matchValue(text: string, re: RegExp): string | undefined {
  return re.exec(text)?.[1]?.trim();
}

function parseNumber(raw?: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : undefined;
}

function parseDurationToMinutes(raw?: string): number | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  let minutes = 0;
  const day = /([0-9.]+)\s*d/.exec(s);
  const hour = /([0-9.]+)\s*h/.exec(s);
  const minute = /([0-9.]+)\s*m/.exec(s);
  const second = /([0-9.]+)\s*s/.exec(s);
  if (day) minutes += Number(day[1]) * 24 * 60;
  if (hour) minutes += Number(hour[1]) * 60;
  if (minute) minutes += Number(minute[1]);
  if (second) minutes += Number(second[1]) / 60;
  if (minutes > 0) return minutes;
  const numeric = Number(s);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function estimatePrintMinutesFromGeometry(size: THREE.Vector3, weightG: number): number {
  const volumeDriven = (weightG / (DENSITY.PLA ?? 1.24)) * 1000 / 7 / 60;
  const travelFloor = (size.x + size.y + size.z) * 0.18;
  return Math.max(5, volumeDriven + travelFloor + 2);
}

/**
 * Bambu `paint_color` is typically 1 hex char per vertex (e.g. "1A2") — we
 * pick the most common slot in the triangle.
 */
function parsePaintSlot(raw: string): number {
  if (!raw) return 1;
  // Strip 0x prefix if present
  const s = raw.replace(/^0x/i, "");
  const counts: Record<string, number> = {};
  for (const ch of s) {
    if (/[0-9a-fA-F]/.test(ch)) {
      const k = ch.toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  let best = "1";
  let bestN = -1;
  for (const [k, n] of Object.entries(counts)) {
    if (n > bestN) { best = k; bestN = n; }
  }
  return parseInt(best, 16) || 1;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").padStart(6, "0").slice(0, 6);
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return { r, g, b };
}

function normalizeHex(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("#")) return trimmed.slice(0, 9);
  return "#" + trimmed.replace(/^0x/i, "").slice(0, 6);
}

function signedTetVolume(
  a: number[], b: number[], c: number[],
): number {
  return (
    a[0] * (b[1] * c[2] - b[2] * c[1]) +
    b[0] * (c[1] * a[2] - c[2] * a[1]) +
    c[0] * (a[1] * b[2] - a[2] * b[1])
  ) / 6;
}

function hasInlineMesh(mesh: any): boolean {
  return !!(mesh?.vertices?.vertex && mesh?.triangles?.triangle);
}

/** Normalize a zip-internal path: strip leading slash, decode, lowercase. */
function normalizePath(p: string): string {
  let s = String(p || "").replace(/^\/+/, "");
  try { s = decodeURIComponent(s); } catch { /* ignore */ }
  return s.toLowerCase();
}

/** Resolve a 3MF reference path relative to the file containing the ref. */
function resolvePath(refPath: string, fromPath: string): string {
  if (!refPath) return fromPath;
  const r = String(refPath);
  if (r.startsWith("/")) return normalizePath(r);
  const dir = fromPath.includes("/") ? fromPath.replace(/\/[^/]*$/, "") : "";
  return normalizePath(dir ? `${dir}/${r}` : r);
}

/** Parse 3MF transform "m11 m12 m13 m21 m22 m23 m31 m32 m33 m41 m42 m43". */
function parseTransform(s: any): number[] | undefined {
  if (!s) return undefined;
  const parts = String(s).trim().split(/\s+/).map(Number);
  if (parts.length !== 12 || parts.some((n) => !Number.isFinite(n))) return undefined;
  return parts;
}

/** Apply a 3MF 4x3 transform to a point. */
function applyTransform(m: number[], p: number[]): number[] {
  const [m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43] = m;
  const [x, y, z] = p;
  return [
    m11 * x + m21 * y + m31 * z + m41,
    m12 * x + m22 * y + m32 * z + m42,
    m13 * x + m23 * y + m33 * z + m43,
  ];
}

/** Compose parent ∘ child transforms (child applied first). */
function composeTransform(parent?: number[], child?: number[]): number[] | undefined {
  if (!parent) return child;
  if (!child) return parent;
  const to44 = (m: number[]) => [
    m[0], m[3], m[6], m[9],
    m[1], m[4], m[7], m[10],
    m[2], m[5], m[8], m[11],
    0,    0,    0,    1,
  ];
  const A = to44(parent);
  const B = to44(child);
  const R = new Array(16).fill(0);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++)
        R[i * 4 + j] += A[i * 4 + k] * B[k * 4 + j];
  return [
    R[0], R[4], R[8],
    R[1], R[5], R[9],
    R[2], R[6], R[10],
    R[3], R[7], R[11],
  ];
}
