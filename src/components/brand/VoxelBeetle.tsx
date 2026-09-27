"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/utils";

const easeOutCirc = (x: number) => Math.sqrt(1 - Math.pow(x - 1, 4));

// Frames of the entrance spin before the figure settles into a slow turn.
const INTRO_FRAMES = 100;

// Idle turn per frame, and how quickly a hover turn catches up with the pointer.
const IDLE_SPEED = 0.004;
const FOLLOW = 0.08;

/**
 * The mascot in 3D: the voxel beetle from src/lib/brand/beetle.ts, drawn
 * with one instanced mesh. It spins in on load and then turns slowly; under
 * a mouse it turns to follow the pointer. three.js loads only when the
 * component mounts, so it never weighs on pages that do not show it. With
 * reduced motion there is no spin-in or idle turn; it still follows the mouse.
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
      const [THREE, { beetleVoxels }] = await Promise.all([import("three"), import("@/lib/brand/beetle")]);
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
      const box = new THREE.BoxGeometry(1, 1, 1);
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

      // Frame the whole figure whichever way it faces: its longest side, with room to turn.
      const zs = voxels.map((v) => v.z);
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs));
      const aspect = width / height;
      const half = (span * 0.58) / Math.min(1, aspect);
      const camera = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 500);
      // The camera circles the beetle; theta = 0 looks at its side, π/2 at its face.
      const radius = 40;
      const baseY = 18;
      const target = new THREE.Vector3(0, 0, 0);
      const startTheta = 0.2 * Math.PI;
      let theta = startTheta;
      let cameraY = baseY;
      let hover: { theta: number; y: number } | null = null;

      const place = () => {
        camera.position.set(radius * Math.sin(theta), cameraY, radius * Math.cos(theta));
        camera.lookAt(target);
      };
      place();

      const onPointerMove = (event: PointerEvent) => {
        // Following the pointer is motion the visitor asks for, so it stays on with reduced motion.
        if (event.pointerType !== "mouse") return;
        const box = container.getBoundingClientRect();
        const nx = ((event.clientX - box.left) / box.width) * 2 - 1;
        const ny = ((event.clientY - box.top) / box.height) * 2 - 1;
        const facing = Math.PI / 2 + nx * 1.1;
        // Take the nearest equivalent angle, so the beetle never spins the long way round.
        const turns = Math.round((theta - facing) / (2 * Math.PI));
        hover = { theta: facing + turns * 2 * Math.PI, y: baseY - ny * 12 };
      };
      const onPointerLeave = () => {
        hover = null;
      };
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);

      let frame = reducedMotion ? INTRO_FRAMES + 1 : 0;
      let request = 0;
      const animate = () => {
        request = requestAnimationFrame(animate);
        if (frame <= INTRO_FRAMES) {
          theta = startTheta - easeOutCirc(frame / (INTRO_FRAMES * 1.2)) * Math.PI * 4;
          frame++;
        } else if (hover) {
          theta += (hover.theta - theta) * FOLLOW;
          cameraY += (hover.y - cameraY) * FOLLOW;
        } else if (!reducedMotion) {
          theta += IDLE_SPEED;
          cameraY += (baseY - cameraY) * FOLLOW;
        }
        place();
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
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
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
      className={cn("relative", className)}
    >
      {!ready && <div className="absolute inset-0 m-auto size-8 animate-spin rounded-full border-2 border-border border-t-primary" />}
    </div>
  );
}
