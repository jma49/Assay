/** The live hero box's shaders (gl-scene.ts). */

export const BAKE_VS = `
  uniform mat4 uRest;
  varying vec4 vRest; varying vec3 vN; varying vec3 vP;
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    vRest = uRest * w; vN = normalize(mat3(modelMatrix) * normal); vP = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

/**
 * The bake, seen from the bake's camera, painted back onto the geometry. Faces that camera could not see (the housing's
 * sides) get the housing's dark metal, a little lighter toward the front edge where the face light reaches. On the
 * housing (uMetal = 1) the metal's highlight from the room light is added only where it is brighter than it was from the
 * bake's viewpoint, so the rest frame stays the bake while the frame's edges catch the light as the camera passes them.
 */
export const BAKE_FS = `
  uniform sampler2D tBake; uniform vec3 uRestPos, uLight; uniform vec3 uSideA, uSideB; uniform float uDepth, uMetal;
  varying vec4 vRest; varying vec3 vN; varying vec3 vP;
  float glint(vec3 n, vec3 v, vec3 l){ return pow(max(dot(n, normalize(l + v)), 0.0), 90.0); }
  void main(){
    vec2 uv = clamp(vRest.xy / vRest.w * 0.5 + 0.5, 0.0, 1.0);
    vec3 c = texture2D(tBake, vec2(uv.x, 1.0 - uv.y)).rgb;
    vec3 n = normalize(vN), vr = normalize(uRestPos - vP), v = normalize(cameraPosition - vP), l = normalize(uLight - vP);
    float facing = dot(n, vr);
    vec3 side = mix(uSideA, uSideB, smoothstep(0.0, uDepth, vP.z)) * (0.75 + 0.35 * max(dot(n, l), 0.0));
    vec3 col = mix(side, c, smoothstep(0.2, 0.55, facing));
    float edge = 1.0 - smoothstep(0.9, 0.995, n.z);
    col += uMetal * edge * max(glint(n, v, l) - glint(n, vr, l), 0.0) * vec3(0.62, 0.66, 0.7);
    gl_FragColor = vec4(col, 1.0);
  }`;

export const FILL_VS = `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export const FILL_FS = `uniform vec3 uCol; uniform float uA; void main(){ gl_FragColor = vec4(uCol, uA); }`;

export const SHADOW_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
/** A soft rectangle: the film's contact shadow on the opal, wider and softer the further the film is lifted. */
export const SHADOW_FS = `
  uniform vec2 uSize; uniform float uPad, uBlur, uA; varying vec2 vUv;
  void main(){
    vec2 p = (vUv - 0.5) * (uSize + 2.0 * uPad);
    vec2 d = abs(p) - 0.5 * uSize + uBlur;
    float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - uBlur;
    float a = 1.0 - smoothstep(-uBlur, uBlur, dist);
    gl_FragColor = vec4(0.0, 0.0, 0.0, a * uA);
  }`;

/** A projective transform (matrix3d) that maps an element's own box (w x h, origin 0 0) onto a quad (TL, TR, BR, BL). */
export function quadMatrix(w: number, h: number, p: [number, number][]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p as [[number, number], [number, number], [number, number], [number, number]];
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den;
  const k = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + k * y3;
  const n = (v: number) => +v.toFixed(7);
  return `matrix3d(${n(a / w)},${n(d / w)},0,${n(g / w)},${n(b / h)},${n(e / h)},0,${n(k / h)},0,0,1,0,${n(x0)},${n(y0)},0,1)`;
}
