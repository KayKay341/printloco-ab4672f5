import * as THREE from "three";

/**
 * STL buffer transforms used to "bake" each part's translate/rotate/scale
 * into raw geometry bytes so the slicer sees the actual plate layout.
 *
 * We always emit BINARY STL — easier to merge.
 */

type Mat3 = [number, number, number, number, number, number, number, number, number];
type Vec3 = [number, number, number];

export type BakeOptions = {
  /** Pre-scale (e.g. inch→mm + user scale). Applied first. */
  preScale?: number;
  /** Rotation in degrees, applied X then Y then Z. */
  rotXDeg?: number;
  rotYDeg?: number;
  rotZDeg?: number;
  /** Translation (mm), applied after scale + rotation. */
  translate?: Vec3;
  /** When true, after rotation the part is re-centered XY and dropped to Z=0 BEFORE translate. */
  layFlatToPlate?: boolean;
};

function rotMatrix(rxDeg: number, ryDeg: number, rzDeg: number): Mat3 {
  const rx = (rxDeg * Math.PI) / 180;
  const ry = (ryDeg * Math.PI) / 180;
  const rz = (rzDeg * Math.PI) / 180;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Rz * Ry * Rx
  const m00 = cz * cy;
  const m01 = cz * sy * sx - sz * cx;
  const m02 = cz * sy * cx + sz * sx;
  const m10 = sz * cy;
  const m11 = sz * sy * sx + cz * cx;
  const m12 = sz * sy * cx - cz * sx;
  const m20 = -sy;
  const m21 = cy * sx;
  const m22 = cy * cx;
  return [m00, m01, m02, m10, m11, m12, m20, m21, m22];
}

function applyMat(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function isAsciiStl(buf: ArrayBuffer): boolean {
  const head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(256, buf.byteLength))).toLowerCase();
  return head.startsWith("solid") && head.includes("facet");
}

/** Parse any STL (ascii or binary) into raw triangle vertex floats. */
function readTriangles(buf: ArrayBuffer): Float32Array {
  if (isAsciiStl(buf)) {
    const text = new TextDecoder().decode(new Uint8Array(buf));
    const verts: number[] = [];
    const re = /vertex\s+(-?[0-9.eE+-]+)\s+(-?[0-9.eE+-]+)\s+(-?[0-9.eE+-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      verts.push(Number(m[1]), Number(m[2]), Number(m[3]));
    }
    return new Float32Array(verts);
  }
  const view = new DataView(buf);
  const tri = view.getUint32(80, true);
  const out = new Float32Array(tri * 9);
  let off = 84;
  for (let i = 0; i < tri; i++) {
    off += 12; // skip normal
    for (let j = 0; j < 9; j++) {
      out[i * 9 + j] = view.getFloat32(off, true);
      off += 4;
    }
    off += 2;
  }
  return out;
}

function writeBinaryStl(verts: Float32Array): ArrayBuffer {
  const triCount = verts.length / 9;
  const out = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(out);
  // 80-byte header (zeroed)
  view.setUint32(80, triCount, true);
  let off = 84;
  for (let i = 0; i < triCount; i++) {
    const ax = verts[i * 9 + 0], ay = verts[i * 9 + 1], az = verts[i * 9 + 2];
    const bx = verts[i * 9 + 3], by = verts[i * 9 + 4], bz = verts[i * 9 + 5];
    const cx = verts[i * 9 + 6], cy = verts[i * 9 + 7], cz = verts[i * 9 + 8];
    // Normal
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    view.setFloat32(off, nx, true); off += 4;
    view.setFloat32(off, ny, true); off += 4;
    view.setFloat32(off, nz, true); off += 4;
    for (let j = 0; j < 9; j++) {
      view.setFloat32(off, verts[i * 9 + j], true);
      off += 4;
    }
    view.setUint16(off, 0, true); off += 2;
  }
  return out;
}

/** Apply pre-scale + rotation + (optional re-center) + translation to an STL. */
export function bakeStl(buf: ArrayBuffer, opts: BakeOptions): ArrayBuffer {
  const tris = readTriangles(buf);
  const scale = opts.preScale ?? 1;
  const rot = rotMatrix(opts.rotXDeg ?? 0, opts.rotYDeg ?? 0, opts.rotZDeg ?? 0);

  // First pass: scale + rotate, also track bbox
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < tris.length; i += 3) {
    const x = tris[i] * scale, y = tris[i + 1] * scale, z = tris[i + 2] * scale;
    const r = applyMat(rot, [x, y, z]);
    tris[i] = r[0]; tris[i + 1] = r[1]; tris[i + 2] = r[2];
    if (r[0] < minX) minX = r[0]; if (r[0] > maxX) maxX = r[0];
    if (r[1] < minY) minY = r[1]; if (r[1] > maxY) maxY = r[1];
    if (r[2] < minZ) minZ = r[2]; if (r[2] > maxZ) maxZ = r[2];
  }

  // Optional: drop to plate (Z=0) and re-center XY before translate
  let ox = 0, oy = 0, oz = 0;
  if (opts.layFlatToPlate) {
    ox = -((minX + maxX) / 2);
    oy = -((minY + maxY) / 2);
    oz = -minZ;
  }
  const [tx, ty, tz] = opts.translate ?? [0, 0, 0];
  ox += tx; oy += ty; oz += tz;

  if (ox !== 0 || oy !== 0 || oz !== 0) {
    for (let i = 0; i < tris.length; i += 3) {
      tris[i] += ox; tris[i + 1] += oy; tris[i + 2] += oz;
    }
  }

  return writeBinaryStl(tris);
}

/** Concatenate multiple baked binary STLs into one. */
export function mergeBinaryStls(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) return writeBinaryStl(new Float32Array(0));
  if (buffers.length === 1) return buffers[0];

  let totalTris = 0;
  const counts: number[] = [];
  for (const b of buffers) {
    const v = new DataView(b);
    const t = v.getUint32(80, true);
    counts.push(t);
    totalTris += t;
  }
  const out = new ArrayBuffer(84 + totalTris * 50);
  const dst = new Uint8Array(out);
  const view = new DataView(out);
  view.setUint32(80, totalTris, true);
  let writeOff = 84;
  for (let bi = 0; bi < buffers.length; bi++) {
    const t = counts[bi];
    if (t === 0) continue;
    const src = new Uint8Array(buffers[bi], 84, t * 50);
    dst.set(src, writeOff);
    writeOff += t * 50;
  }
  return out;
}

/** Approx bounding box of a binary/ascii STL for verification. */
export function bboxOfStl(buf: ArrayBuffer) {
  const tris = readTriangles(buf);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < tris.length; i += 3) {
    const x = tris[i], y = tris[i + 1], z = tris[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ, x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
}

/** Convert a triangle-only Three geometry into binary STL for the slicer. */
export function geometryToBinaryStl(geometry: THREE.BufferGeometry): ArrayBuffer {
  const pos = geometry.getAttribute("position");
  if (!pos || pos.itemSize < 3) return writeBinaryStl(new Float32Array(0));

  const verts = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    verts[i * 3 + 0] = pos.getX(i);
    verts[i * 3 + 1] = pos.getY(i);
    verts[i * 3 + 2] = pos.getZ(i);
  }
  return writeBinaryStl(verts);
}
