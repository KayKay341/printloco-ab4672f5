import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Props {
  geometry: THREE.BufferGeometry | null;
  color?: string;
  /** When true, render with the geometry's vertex colors (multi-color 3MF). */
  vertexColors?: boolean;
  className?: string;
}

const StlPreview = ({ geometry, color = "#9333EA", vertexColors = false, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !geometry) return;
    const container = containerRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(1, 1.2, 1);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(-1, -0.5, -1);
    scene.add(rim);

    const geom = geometry.clone();
    geom.center();
    geom.computeBoundingSphere();
    const radius = geom.boundingSphere?.radius ?? 50;

    const mat = new THREE.MeshStandardMaterial({
      color: vertexColors ? new THREE.Color(0xffffff) : new THREE.Color(color),
      vertexColors,
      metalness: 0.15,
      roughness: 0.55,
      flatShading: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    scene.add(mesh);

    camera.position.set(radius * 1.6, radius * 1.4, radius * 2.0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      mesh.rotation.z += 0.003;
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
  }, [geometry, color, vertexColors]);

  return <div ref={containerRef} className={className} />;
};

export default StlPreview;
