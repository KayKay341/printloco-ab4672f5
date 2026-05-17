import * as THREE from "three";

/**
 * Maker Set Smart
 * Utilities for automatic build plate optimization.
 */

/**
 * Finds the best print orientation for a geometry.
 * Heuristic: Largest flat area touching the build plate (Z=0).
 * For now, we sample the 6 main axis-aligned orientations and pick the one with lowest height
 * and most base contact area.
 */
export function autoOrient(geometry: THREE.BufferGeometry): { x: number; y: number; z: number } {
  const testRotations = [
    { x: 0, y: 0, z: 0 },
    { x: 90, y: 0, z: 0 },
    { x: 180, y: 0, z: 0 },
    { x: 270, y: 0, z: 0 },
    { x: 0, y: 90, z: 0 },
    { x: 0, y: 270, z: 0 },
  ];

  let bestRot = testRotations[0];
  let minHeight = Infinity;
  
  // Clone to avoid mutating original
  const temp = geometry.clone();
  
  // Ensure we have position attribute
  const pos = temp.getAttribute("position");
  if (!pos) return bestRot;

  for (const rot of testRotations) {
    const matrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(rot.x),
        THREE.MathUtils.degToRad(rot.y),
        THREE.MathUtils.degToRad(rot.z)
      )
    );
    
    // We only need to check bbox for orientation scoring
    // For more complex scoring (base area), we'd need more logic
    const arr = pos.array;
    let minZ = Infinity;
    let maxZ = -Infinity;
    
    // Check every 10th vertex for speed if it's huge, but STLs are usually fine
    const step = arr.length > 30000 ? 30 : 3; 
    for (let i = 0; i < arr.length; i += step) {
      const v = new THREE.Vector3(arr[i], arr[i+1], arr[i+2]);
      v.applyMatrix4(matrix);
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    }

    const height = maxZ - minZ;
    
    // Heuristic: Prefer lowest height (more stable, faster to print)
    if (height < minHeight - 0.1) {
      minHeight = height;
      bestRot = rot;
    }
  }

  temp.dispose();
  return bestRot;
}

/**
 * Packs multiple parts onto a build plate.
 * Uses a simple shelf-packing algorithm.
 */
export function smartLayout(
  parts: Array<{ width: number; depth: number }>,
  plateSize: { x: number; y: number },
  padding = 5
): Array<{ x: number; y: number }> {
  // Sort parts by depth (height in 2D) descending
  const sorted = parts
    .map((p, i) => ({ ...p, id: i }))
    .sort((a, b) => b.depth - a.depth);

  const results = new Array(parts.length).fill({ x: 0, y: 0 });
  
  let currentX = -plateSize.x / 2 + padding;
  let currentY = -plateSize.y / 2 + padding;
  let rowMaxHeight = 0;

  for (const p of sorted) {
    if (currentX + p.width + padding > plateSize.x / 2) {
      // Move to next row
      currentX = -plateSize.x / 2 + padding;
      currentY += rowMaxHeight + padding;
      rowMaxHeight = 0;
    }

    results[p.id] = {
      x: currentX + p.width / 2,
      y: currentY + p.depth / 2,
    };

    currentX += p.width + padding;
    rowMaxHeight = Math.max(rowMaxHeight, p.depth);
  }

  return results;
}
