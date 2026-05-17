import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { type Unit } from "@/lib/units";

interface Plate {
  x: number; // mm
  y: number; // mm
  z: number; // mm
}

export interface PreviewPart {
  id: string;
  geometry: THREE.BufferGeometry; // already transformed (XY-translated, rotated, on plate)
  color: string;
  selected?: boolean;
  collides?: boolean;
}

interface Props {
  /** Single-geometry mode (legacy, used for 3MF preview). */
  geometry?: THREE.BufferGeometry | null;
  /** Multi-part mode (new in-browser slicer). Takes precedence over `geometry`. */
  parts?: PreviewPart[];
  color?: string;
  vertexColors?: boolean;
  plate?: Plate | null;
  overflow?: boolean;
  className?: string;
  /** 0 to 1, where 1 means fully visible and 0 means fully clipped from top. */
  clippingPlaneZ?: number;
  wireframe?: boolean;
  unit?: Unit;
  /** Click-to-select callback. Null = clicked empty plate. */
  onSelect?: (partId: string | null) => void;
  /** Drag-to-move on plate (XY in mm). */
  onDragMove?: (partId: string, dx: number, dy: number) => void;
}

const StlPreview = ({
  geometry,
  parts,
  color = "#9333EA",
  vertexColors = false,
  plate,
  overflow,
  className,
  clippingPlaneZ = 1,
  wireframe = false,
  unit = "mm",
  onSelect,
  onDragMove,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stash latest callbacks/parts so we can read them inside event handlers
  // without re-creating the renderer.
  const latest = useRef({ onSelect, onDragMove, parts: parts ?? [] });
  latest.current = { onSelect, onDragMove, parts: parts ?? [] };

  useEffect(() => {
    if (!containerRef.current) return;
    const hasParts = !!parts && parts.length > 0;
    if (!hasParts && !geometry) return;
    const container = containerRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.localClippingEnabled = true; // Enable clipping
    container.appendChild(renderer.domElement);

    // Clipping plane (pointing down -Z in slicer space, but Three world is Y-up for camera)
    // Actually our 'root' is rotated -90 on X, so world +Y is slicer +Z.
    // We want to clip from top (+Z) down.
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10000);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(1, 1.5, 1);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(-1, -0.5, -1);
    scene.add(rim);

    // Z-up world group (slicer convention)
    const root = new THREE.Group();
    root.rotation.x = -Math.PI / 2;
    scene.add(root);

    // Add technical grid
    const gridSize = plate ? Math.max(plate.x, plate.y) : 256;
    // For inches, one line per inch. For mm, one line per 10mm.
    const gridDivs = unit === "in" ? Math.max(1, Math.round(gridSize / 25.4)) : Math.max(1, Math.round(gridSize / 10));
    
    // Scale grid precisely to fit the whole divisions
    const finalGridSize = unit === "in" ? gridDivs * 25.4 : gridDivs * 10;
    
    const grid = new THREE.GridHelper(finalGridSize, gridDivs, 0x444444, 0x222222);
    grid.rotation.x = Math.PI / 2;
    root.add(grid);

    // Track per-part meshes for raycasting / drag
    const partMeshes = new Map<string, THREE.Mesh>();
    const disposables: { dispose: () => void }[] = [];

    // Build overall size for camera framing
    let frame = plate ? Math.max(plate.x, plate.y, plate.z) : 100;
    let maxZ = 0;

    if (hasParts) {
      for (const p of parts!) {
        const partColor = p.collides ? new THREE.Color("#ef4444") : toThreeColor(p.color || color);
        const mat = new THREE.MeshStandardMaterial({
          color: partColor,
          metalness: 0.15,
          roughness: 0.55,
          emissive: p.selected ? toThreeColor(p.color || color).multiplyScalar(0.25) : new THREE.Color(0x000000),
          clippingPlanes: [clipPlane],
          wireframe,
        });
        const g = p.geometry; // already transformed by caller
        const mesh = new THREE.Mesh(g, mat);
        (mesh.userData as any).partId = p.id;
        root.add(mesh);
        partMeshes.set(p.id, mesh);
        disposables.push(mat);

        // Selection outline
        if (p.selected) {
          const edges = new THREE.EdgesGeometry(g, 30);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
          const wire = new THREE.LineSegments(edges, lineMat);
          mesh.add(wire);
          disposables.push(edges, lineMat);
        }

        g.computeBoundingBox();
        const sz = new THREE.Vector3();
        g.boundingBox!.getSize(sz);
        frame = Math.max(frame, sz.x, sz.y, sz.z);
        maxZ = Math.max(maxZ, g.boundingBox!.max.z);
      }
    } else if (geometry) {
      const geom = geometry.clone();
      geom.computeBoundingBox();
      const bb = geom.boundingBox!;
      const center = new THREE.Vector3();
      bb.getCenter(center);
      geom.translate(-center.x, -center.y, -bb.min.z);
      geom.computeBoundingBox();
      const size = new THREE.Vector3();
      geom.boundingBox!.getSize(size);

      const partColor = overflow ? new THREE.Color("#ef4444") : toThreeColor(color);
      const mat = new THREE.MeshStandardMaterial({
        color: vertexColors ? new THREE.Color(0xffffff) : partColor,
        vertexColors,
        metalness: 0.15,
        roughness: 0.55,
        clippingPlanes: [clipPlane],
        wireframe,
      });
      const mesh = new THREE.Mesh(geom, mat);
      root.add(mesh);
      disposables.push(mat, geom);
      frame = Math.max(frame, size.x, size.y, size.z);
      maxZ = Math.max(maxZ, size.z);
    }

    // Update clipping plane constant based on percentage
    // In world space (after root rotation), slicer Z is world Y.
    // Constant is distance from origin along normal. Normal is (0, -1, 0) (down).
    // So if maxZ is 50, and factor is 1, we want plane at 50.
    // If factor is 0.5, we want plane at 25.
    clipPlane.constant = maxZ * clippingPlaneZ;

    // Build plate
    if (plate) {
      const plateGroup = new THREE.Group();

      const plateGeo = new THREE.PlaneGeometry(plate.x, plate.y);
      const plateMat = new THREE.MeshStandardMaterial({
        color: 0x111827, metalness: 0.2, roughness: 0.85, side: THREE.DoubleSide,
      });
      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateMesh.position.z = -0.05;
      plateGroup.add(plateMesh);
      disposables.push(plateGeo, plateMat);

      const grid = new THREE.GridHelper(
        Math.max(plate.x, plate.y),
        Math.round(Math.max(plate.x, plate.y) / 10),
        0x6b7280,
        0x374151,
      );
      grid.rotation.x = Math.PI / 2;
      grid.position.z = 0;
      plateGroup.add(grid);

      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(plate.x, plate.y, 0.1));
      const edgeMat = new THREE.LineBasicMaterial({ color: overflow ? 0xef4444 : 0x9333ea });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      plateGroup.add(edges);
      disposables.push(edgeGeo, edgeMat);

      const poleGeo = new THREE.BoxGeometry(2, 2, plate.z);
      const poleMat = new THREE.MeshBasicMaterial({ color: 0x9333ea, transparent: true, opacity: 0.18 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(-plate.x / 2, -plate.y / 2, plate.z / 2);
      plateGroup.add(pole);
      disposables.push(poleGeo, poleMat);

      root.add(plateGroup);
    }

    camera.position.set(frame * 1.1, frame * 1.1, frame * 1.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, plate ? plate.z / 4 : frame / 4);

    // ----- Click / drag handling -----
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // world Y=0 (plate floor in world space)
    const dragState = {
      active: false,
      partId: null as string | null,
      lastWorld: new THREE.Vector3(),
      moved: false,
    };

    const ndcFromEvent = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickPart = (): { id: string | null; point: THREE.Vector3 | null } => {
      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(partMeshes.values());
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        return { id: (hits[0].object.userData as any).partId ?? null, point: hits[0].point.clone() };
      }
      // Fallback: intersect plate plane
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, point);
      return { id: null, point: point.clone() };
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      ndcFromEvent(ev);
      const picked = pickPart();
      if (picked.id) {
        dragState.active = true;
        dragState.partId = picked.id;
        dragState.lastWorld.copy(picked.point ?? new THREE.Vector3());
        dragState.moved = false;
        controls.enabled = false;
        renderer.domElement.setPointerCapture(ev.pointerId);
      }
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (!dragState.active || !dragState.partId) return;
      ndcFromEvent(ev);
      raycaster.setFromCamera(mouse, camera);
      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(dragPlane, point)) return;
      // World space: plate is XZ (because root rotated -90° on X). dx → X, dz → -Y(slicer)
      const dxWorld = point.x - dragState.lastWorld.x;
      const dzWorld = point.z - dragState.lastWorld.z;
      // In slicer space (Z-up), +X stays +X, world +Z is slicer -Y.
      const dx = dxWorld;
      const dy = -dzWorld;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        dragState.moved = true;
        latest.current.onDragMove?.(dragState.partId, dx, dy);
        dragState.lastWorld.copy(point);
      }
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (dragState.active) {
        try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch { /* noop */ }
      }
      const wasDrag = dragState.moved;
      const downPart = dragState.partId;
      dragState.active = false;
      dragState.partId = null;
      dragState.moved = false;
      controls.enabled = true;
      // If they didn't drag, treat as a click → select
      if (!wasDrag) {
        ndcFromEvent(ev);
        const picked = pickPart();
        latest.current.onSelect?.(picked.id ?? downPart ?? null);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.dispose();
      for (const d of disposables) d.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // We deliberately re-create the scene only when geometry/parts identity or plate dims change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    geometry,
    parts,
    color,
    vertexColors,
    plate?.x, plate?.y, plate?.z,
    overflow,
    clippingPlaneZ,
    wireframe,
    unit,
  ]);

  return <div ref={containerRef} className={className} />;
};

export default StlPreview;

const toThreeColor = (value: string) => {
  const varMatch = value.match(/hsl\(var\((--[^)]+)\)\)/);
  if (varMatch && typeof window !== "undefined") {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varMatch[1]).trim();
    const [h, s, l] = raw.split(/\s+/);
    if (h && s && l) return new THREE.Color(`hsl(${h}, ${s}, ${l})`);
  }
  return new THREE.Color(value);
};
