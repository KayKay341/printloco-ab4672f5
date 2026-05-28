import * as THREE from "three";

export type SlicerSettings = {
  layerHeight: number;
  infill: number;
  nozzleTemp: number;
  speed: number;
  material: "PLA" | "ABS" | "PETG";
};

export type ModelInfo = {
  width: number;
  height: number;
  depth: number;
  volumeMm3: number;
  triangles: number;
};

export type SlicerStats = {
  layers: number;
  printMinutes: number;
  weightG: number;
  materialCost: number;
  dimensions: ModelInfo;
};

const MATERIAL_DENSITY: Record<SlicerSettings["material"], number> = {
  PLA: 1.24,
  ABS: 1.04,
  PETG: 1.27,
};

const MATERIAL_COST_PER_GRAM = 0.05;

export const DEFAULT_SLICER_SETTINGS: SlicerSettings = {
  layerHeight: 0.2,
  infill: 20,
  nozzleTemp: 210,
  speed: 50,
  material: "PLA",
};

export const MATERIAL_DEFAULTS: Record<SlicerSettings["material"], number> = {
  PLA: 210,
  ABS: 230,
  PETG: 235,
};

export const PRESETS: Array<{ name: string; description: string; settings: Pick<SlicerSettings, "layerHeight" | "infill" | "speed"> }> = [
  { name: "Fast & Dirty", description: "Quick draft prints", settings: { layerHeight: 0.4, infill: 10, speed: 80 } },
  { name: "Normal", description: "Balanced everyday profile", settings: { layerHeight: 0.2, infill: 20, speed: 50 } },
  { name: "High Quality", description: "Fine detail and cleaner walls", settings: { layerHeight: 0.1, infill: 40, speed: 30 } },
  { name: "Super Strong", description: "Durable functional parts", settings: { layerHeight: 0.15, infill: 80, speed: 40 } },
];

export function geometryToModelInfo(geometry: THREE.BufferGeometry): ModelInfo {
  const prepared = toTriangleGeometry(geometry);
  prepared.computeBoundingBox();
  const bbox = prepared.boundingBox ?? new THREE.Box3();
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const bboxVolume = Math.max(0, size.x * size.y * size.z);
  const meshVolume = meshVolumeMm3(prepared);
  const usableVolume = meshVolume > bboxVolume * 0.001 && meshVolume <= bboxVolume * 1.15
    ? meshVolume
    : bboxVolume * 0.35;

  return {
    width: round(size.x, 1),
    height: round(size.z, 1),
    depth: round(size.y, 1),
    volumeMm3: Math.max(0, usableVolume),
    triangles: Math.floor((prepared.getAttribute("position")?.count ?? 0) / 3),
  };
}

export function transformGeometryForSlicer(
  geometry: THREE.BufferGeometry,
  rotationDeg: { x: number; y: number; z: number },
): THREE.BufferGeometry {
  const prepared = toTriangleGeometry(geometry);
  const matrix = new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(rotationDeg.x),
      THREE.MathUtils.degToRad(rotationDeg.y),
      THREE.MathUtils.degToRad(rotationDeg.z),
      "XYZ",
    ));
  prepared.applyMatrix4(matrix);
  prepared.computeBoundingBox();
  const bbox = prepared.boundingBox;
  if (bbox) {
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    prepared.translate(-center.x, -center.y, -bbox.min.z);
  }
  prepared.computeBoundingBox();
  prepared.computeVertexNormals();
  return prepared;
}

export function calculateSlicerStats(info: ModelInfo | null, settings: SlicerSettings): SlicerStats | null {
  if (!info || info.volumeMm3 <= 0 || info.height <= 0) return null;
  const layers = Math.max(1, Math.ceil(info.height / settings.layerHeight));
  const shellFactor = 0.22;
  const infillFactor = shellFactor + (1 - shellFactor) * (settings.infill / 100);
  const materialVolumeCm3 = (info.volumeMm3 / 1000) * infillFactor;
  const weightG = materialVolumeCm3 * MATERIAL_DENSITY[settings.material];
  const travelFactor = 1.45;
  const extrusionLengthMm = Math.max(1, info.volumeMm3 * infillFactor / Math.max(0.08, settings.layerHeight * 0.42));
  const printMinutes = Math.max(1, (extrusionLengthMm * travelFactor) / Math.max(1, settings.speed) / 60 + layers * 0.18);

  return {
    layers,
    printMinutes,
    weightG,
    materialCost: weightG * MATERIAL_COST_PER_GRAM,
    dimensions: info,
  };
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function settingsToText(settings: SlicerSettings, stats: SlicerStats | null, fileName: string | null): string {
  const lines = [
    "PrintLoco 3D Slicer Settings",
    fileName ? `File: ${fileName}` : null,
    `Material: ${settings.material}`,
    `Layer Height: ${settings.layerHeight.toFixed(2)}mm`,
    `Infill: ${settings.infill}%`,
    `Nozzle Temperature: ${settings.nozzleTemp}°C`,
    `Print Speed: ${settings.speed}mm/s`,
    stats ? `Layers: ${stats.layers}` : null,
    stats ? `Estimated Time: ${formatDuration(stats.printMinutes)}` : null,
    stats ? `Estimated Weight: ${stats.weightG.toFixed(1)}g` : null,
    stats ? `Dimensions: ${stats.dimensions.width} × ${stats.dimensions.height} × ${stats.dimensions.depth}mm` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function generateBasicGcode(fileName: string, settings: SlicerSettings, stats: SlicerStats): string {
  const width = Math.max(5, stats.dimensions.width);
  const depth = Math.max(5, stats.dimensions.depth);
  const halfW = width / 2;
  const halfD = depth / 2;
  const feed = Math.round(settings.speed * 60);
  const lines: string[] = [
    "; PrintLoco generated RepRap GCODE",
    `; Source: ${fileName}`,
    `; Material: ${settings.material}`,
    `; Layer height: ${settings.layerHeight.toFixed(2)}mm`,
    `; Infill: ${settings.infill}%`,
    `; Estimated weight: ${stats.weightG.toFixed(1)}g`,
    `; Estimated print time: ${formatDuration(stats.printMinutes)}`,
    "G21 ; millimeters",
    "G90 ; absolute positioning",
    "M82 ; absolute extrusion",
    `M104 S${settings.nozzleTemp}`,
    "M140 S60",
    "G28 ; home axes",
    `M109 S${settings.nozzleTemp}`,
    "M190 S60",
    "G92 E0",
  ];

  let e = 0;
  const layerLimit = Math.min(stats.layers, 5000);
  const infillStep = Math.max(4, 22 - settings.infill * 0.16);
  for (let i = 0; i < layerLimit; i++) {
    const z = (i + 1) * settings.layerHeight;
    const shrink = Math.min(0.42, i / Math.max(1, layerLimit) * 0.28);
    const x0 = -halfW * (1 - shrink);
    const x1 = halfW * (1 - shrink);
    const y0 = -halfD * (1 - shrink);
    const y1 = halfD * (1 - shrink);
    const perim = Math.max(1, 2 * ((x1 - x0) + (y1 - y0)));
    lines.push(`;LAYER:${i}`);
    lines.push(`G0 Z${z.toFixed(3)} F900`);
    lines.push(`G0 X${x0.toFixed(2)} Y${y0.toFixed(2)} F6000`);
    e += perim * 0.035;
    lines.push(`G1 X${x1.toFixed(2)} Y${y0.toFixed(2)} E${(e * 0.25).toFixed(5)} F${feed}`);
    lines.push(`G1 X${x1.toFixed(2)} Y${y1.toFixed(2)} E${(e * 0.50).toFixed(5)} F${feed}`);
    lines.push(`G1 X${x0.toFixed(2)} Y${y1.toFixed(2)} E${(e * 0.75).toFixed(5)} F${feed}`);
    lines.push(`G1 X${x0.toFixed(2)} Y${y0.toFixed(2)} E${e.toFixed(5)} F${feed}`);

    if (settings.infill > 0 && i % 2 === 0) {
      for (let y = y0 + infillStep; y < y1; y += infillStep) {
        e += Math.abs(x1 - x0) * 0.012 * (settings.infill / 100);
        lines.push(`G0 X${x0.toFixed(2)} Y${y.toFixed(2)} F6000`);
        lines.push(`G1 X${x1.toFixed(2)} Y${y.toFixed(2)} E${e.toFixed(5)} F${feed}`);
      }
    }
  }

  lines.push("M104 S0");
  lines.push("M140 S0");
  lines.push("G91");
  lines.push("G1 Z10 F900");
  lines.push("G90");
  lines.push("G28 X Y");
  lines.push("M84");
  return `${lines.join("\n")}\n`;
}

export function safeBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "printloco_model";
}

function toTriangleGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const pos = source.getAttribute("position");
  if (!pos) return source;
  const arr = pos.array;
  const copy = new Float32Array(arr.length);
  copy.set(Array.from(arr as ArrayLike<number>));
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(copy, 3));
  // Preserve vertex colors (used for multi-color 3MF previews).
  const color = source.getAttribute("color");
  if (color) {
    const ca = color.array as ArrayLike<number>;
    const colCopy = new Float32Array(ca.length);
    colCopy.set(Array.from(ca));
    out.setAttribute("color", new THREE.BufferAttribute(colCopy, color.itemSize));
  }
  return out;
}

function meshVolumeMm3(geometry: THREE.BufferGeometry): number {
  const pos = geometry.getAttribute("position");
  if (!pos) return 0;
  const arr = pos.array as ArrayLike<number>;
  let volume = 0;
  for (let i = 0; i + 8 < arr.length; i += 9) {
    const ax = arr[i], ay = arr[i + 1], az = arr[i + 2];
    const bx = arr[i + 3], by = arr[i + 4], bz = arr[i + 5];
    const cx = arr[i + 6], cy = arr[i + 7], cz = arr[i + 8];
    volume += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6;
  }
  return Math.abs(volume);
}

function round(value: number, places: number): number {
  const p = 10 ** places;
  return Math.round(value * p) / p;
}
