import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Plate {
  x: number; // mm
  y: number; // mm
  z: number; // mm
}

interface Props {
  geometry: THREE.BufferGeometry | null;
  color?: string;
  /** When true, render with the geometry's vertex colors (multi-color 3MF). */
  vertexColors?: boolean;
  /** Build plate to draw under the model. When omitted, plate is hidden. */
  plate?: Plate | null;
  /** When true, render the part in red to indicate it overflows the plate. */
  overflow?: boolean;
  className?: string;
}

const StlPreview = ({ geometry, color = "#9333EA", vertexColors = false, plate, overflow, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !geometry) return;
    const container = containerRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(1, 1.5, 1);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(-1, -0.5, -1);
    scene.add(rim);

    const geom = geometry.clone();
    // Move the part so it sits ON TOP of the plate (Z=0, centered XY) — like a real slicer.
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    const center = new THREE.Vector3();
    bb.getCenter(center);
    geom.translate(-center.x, -center.y, -bb.min.z);
    geom.computeBoundingBox();
    const size = new THREE.Vector3();
    geom.boundingBox!.getSize(size);

    const partColor = overflow ? new THREE.Color("#ef4444") : new THREE.Color(color);
    const mat = new THREE.MeshStandardMaterial({
      color: vertexColors ? new THREE.Color(0xffffff) : partColor,
      vertexColors,
      metalness: 0.15,
      roughness: 0.55,
      flatShading: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    // Three's default "up" is Y. Slicer convention is Z-up; rotate the WHOLE
    // scene group so plate XY is the floor.
    const root = new THREE.Group();
    root.rotation.x = -Math.PI / 2;
    root.add(mesh);
    scene.add(root);

    // Build plate
    let plateGroup: THREE.Group | null = null;
    if (plate) {
      plateGroup = new THREE.Group();

      // Plate surface
      const plateGeo = new THREE.PlaneGeometry(plate.x, plate.y);
      const plateMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.2,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });
      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateGroup.add(plateMesh);

      // Grid (10mm subdivisions, every 50mm bolder)
      const grid = new THREE.GridHelper(Math.max(plate.x, plate.y), Math.round(Math.max(plate.x, plate.y) / 10), 0x6b7280, 0x374151);
      grid.rotation.x = Math.PI / 2; // align to XY plane
      grid.position.z = 0.05;
      plateGroup.add(grid);

      // Plate outline
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(plate.x, plate.y, 0.1));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x9333ea });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      plateGroup.add(edges);

      // Z-axis pole at corner showing build height
      const poleGeo = new THREE.BoxGeometry(2, 2, plate.z);
      const poleMat = new THREE.MeshBasicMaterial({ color: 0x9333ea, transparent: true, opacity: 0.25 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(-plate.x / 2, -plate.y / 2, plate.z / 2);
      plateGroup.add(pole);

      root.add(plateGroup);
    }

    // Camera framed to plate-or-part
    const frame = plate
      ? Math.max(plate.x, plate.y, plate.z, size.x, size.y, size.z)
      : Math.max(size.x, size.y, size.z, 50);
    camera.position.set(frame * 1.1, frame * 1.1, frame * 1.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, plate ? Math.min(plate.z, size.z) / 2 : size.y / 2, 0);

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
      renderer.dispose();
      mat.dispose();
      geom.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [geometry, color, vertexColors, plate?.x, plate?.y, plate?.z, overflow]);

  return <div ref={containerRef} className={className} />;
};

export default StlPreview;
