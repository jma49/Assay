/**
 * The live hero box's scene graph: the wall and the housing painted with the bake from the bake's own camera (so the rest
 * frame is the poster), the lit face that the push-in ends on, and the film's soft contact shadow on the opal.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BAKE_FS, BAKE_VS, FILL_FS, FILL_VS, SHADOW_FS, SHADOW_VS } from "./gl-shaders";

// the numbers the hero's desktop bake was rendered with
export const L = { fov: 30, camZ: 3.2, bx: 0.6, by: -0.05, fw: 1.26, fh: 0.92 };
export const DEPTH = 0.085;
const FRAME = 0.042;
const RAIL = 0.085;

export type Built = ReturnType<typeof buildScene>;

export function buildScene(bitmap: ImageBitmap, maxAnisotropy: number) {
  const tex = new THREE.Texture(bitmap);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;

  const scene = new THREE.Scene();
  const restCam = new THREE.PerspectiveCamera(L.fov, 1.6, 0.05, 50);
  const camera = new THREE.PerspectiveCamera(L.fov, 1.6, 0.02, 50);
  const uRest = new THREE.Matrix4();
  const bakeMat = new THREE.ShaderMaterial({
    vertexShader: BAKE_VS,
    fragmentShader: BAKE_FS,
    uniforms: {
      tBake: { value: tex },
      uRest: { value: uRest },
      uRestPos: { value: new THREE.Vector3(0, 0, L.camZ) },
      uSideA: { value: new THREE.Vector3(0.075, 0.08, 0.088) },
      uSideB: { value: new THREE.Vector3(0.2, 0.22, 0.24) },
      uDepth: { value: DEPTH },
      // the bake's room light (a spot above and to the left of the camera's axis, in front of the box)
      uLight: { value: new THREE.Vector3(L.bx - 0.1, L.by + 0.25, 2.3) },
      uMetal: { value: 0 },
    },
  });
  const metalMat = bakeMat.clone();
  metalMat.uniforms.tBake!.value = tex;
  metalMat.uniforms.uRest!.value = uRest;
  metalMat.uniforms.uMetal!.value = 1;
  const wallGeo = new THREE.PlaneGeometry(14, 9);
  const wall = new THREE.Mesh(wallGeo, bakeMat);
  wall.position.z = -0.002; // as in the bake: never coplanar with the housing's back
  scene.add(wall);
  const housingGeo = new RoundedBoxGeometry(L.fw + FRAME * 2, L.fh + FRAME + RAIL, DEPTH, 6, 0.012);
  const housing = new THREE.Mesh(housingGeo, metalMat);
  housing.position.set(L.bx, L.by + (FRAME - RAIL) / 2, DEPTH / 2);
  scene.add(housing);
  // the lit face as the next section's ground (the poster path's .cam-face), drawn under the shadow
  const fillGeo = new THREE.PlaneGeometry(2, 2);
  const fillMat = new THREE.ShaderMaterial({
    vertexShader: FILL_VS,
    fragmentShader: FILL_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uCol: { value: new THREE.Vector3(238 / 255, 242 / 255, 243 / 255) }, uA: { value: 0 } },
  });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.frustumCulled = false;
  fill.renderOrder = 10;
  scene.add(fill);
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: SHADOW_VS,
    fragmentShader: SHADOW_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uPad: { value: 0.05 }, uBlur: { value: 0.01 }, uA: { value: 0 } },
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.frustumCulled = false;
  shadow.renderOrder = 11;
  shadow.visible = false;
  scene.add(shadow);
  const disposables: { dispose(): void }[] = [tex, bakeMat, metalMat, wallGeo, housingGeo, fillGeo, fillMat, shadowGeo, shadowMat];
  return { tex, scene, restCam, camera, uRest, fillMat, shadow, shadowMat, dispose: () => disposables.forEach((d) => d.dispose()) };
}
