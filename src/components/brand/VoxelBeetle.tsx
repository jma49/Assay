"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/utils";

const easeOutCirc = (x: number) => Math.sqrt(1 - Math.pow(x - 1, 4));

// Frames of the entrance spin before the figure settles into a slow turn.
const INTRO_FRAMES = 100;

/**
 * The mascot in 3D: the voxel beetle from src/lib/brand/beetle.ts, drawn
 * with one instanced mesh. It spins in on load, then turns slowly and can
 * be dragged. three.js loads only when the component mounts, so it never
 * weighs on pages that do not show it. With reduced motion it stays still.
 */
export function VoxelBeetle({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { OrbitControls }, { beetleVoxels }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("@/lib/brand/beetle"),
      ]);
      if (disposed) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const width = container.clientWidth;
      const height = container.clientHeight;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const voxels = beetleVoxels();
      const box = new THREE.BoxGeometry(0.96, 0.96, 0.96);
      const material = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.15 });
      const mesh = new THREE.InstancedMesh(box, material, voxels.length);
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      voxels.forEach((voxel, i) => {
        matrix.setPosition(voxel.x, voxel.y, voxel.z);
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, color.set(voxel.color));
      });
      // Centre the model on its bounding box.
      const xs = voxels.map((v) => v.x);
      const ys = voxels.map((v) => v.y);
      mesh.position.set(-(Math.min(...xs) + Math.max(...xs)) / 2, -(Math.min(...ys) + Math.max(...ys)) / 2, 0);
      scene.add(mesh);

      scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(10, 20, 14);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xb9cbff, 1.2);
      rim.position.set(-14, 8, -10);
      scene.add(rim);

      const span = Math.max(...xs) - Math.min(...xs);
      const half = span * 0.46;
      const aspect = width / height;
      const camera = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 500);
      const start = new THREE.Vector3(40 * Math.sin(0.2 * Math.PI), 18, 40 * Math.cos(0.2 * Math.PI));
      camera.position.copy(start);
      const target = new THREE.Vector3(0, 0, 0);
      camera.lookAt(target);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target = target;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = !reducedMotion;
      controls.autoRotateSpeed = 1.2;

      let frame = reducedMotion ? INTRO_FRAMES + 1 : 0;
      let request = 0;
      const animate = () => {
        request = requestAnimationFrame(animate);
        if (frame <= INTRO_FRAMES) {
          const angle = -easeOutCirc(frame / (INTRO_FRAMES * 1.2)) * Math.PI * 4;
          camera.position.set(
            start.x * Math.cos(angle) + start.z * Math.sin(angle),
            start.y,
            start.z * Math.cos(angle) - start.x * Math.sin(angle),
          );
          camera.lookAt(target);
          frame++;
        } else {
          controls.update();
        }
        renderer.render(scene, camera);
      };
      animate();
      setReady(true);

      const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        const a = w / h;
        camera.left = -half * a;
        camera.right = half * a;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        cancelAnimationFrame(request);
        window.removeEventListener("resize", onResize);
        controls.dispose();
        box.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Assay's mascot, a rhinoceros beetle made of blue voxels"
      className={cn("relative touch-pan-y [&>canvas]:cursor-grab [&>canvas]:active:cursor-grabbing", className)}
    >
      {!ready && <div className="absolute inset-0 m-auto size-8 animate-spin rounded-full border-2 border-border border-t-primary" />}
    </div>
  );
}
