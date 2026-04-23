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
  const totalWeightG = weightPerSlot.reduce((a, b) => a + b, 0);

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
    weightPerSlot,
    totalWeightG,
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
