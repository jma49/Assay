/**
 * The Broken film's fog: fbm noise, domain-warped, drifting (WebGL1, premultiplied alpha over the baked poster). Soft,
 * so it renders at half the film's CSS size, at ~30 fps. The poster is hidden (`.is-drawn`) only once a frame is drawn.
 */
const FRAG = `precision mediump float;
uniform vec2 r; uniform float t;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / r.y * 2.4;
  vec2 q = vec2(fbm(uv + vec2(0.0, t * 0.045)), fbm(uv + vec2(5.2, 1.3) - t * 0.035));
  vec2 w = vec2(fbm(uv + 3.0 * q + vec2(1.7 + t * 0.02, 9.2)), fbm(uv + 3.0 * q + vec2(8.3, 2.8 - t * 0.025)));
  float f = fbm(uv + 2.2 * w);
  float d = smoothstep(0.28, 0.86, f);
  vec3 c = mix(vec3(0.52, 0.56, 0.58), vec3(0.85, 0.88, 0.89), d);
  c += (h(gl_FragCoord.xy + fract(t * 7.0) * 61.0) - 0.5) * 0.04;
  float a = mix(0.8, 0.97, d);
  gl_FragColor = vec4(c * a, a);
}`;
const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

export interface Fog {
  once(): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

export function fog(film: HTMLElement): Fog | null {
  const poster = film.querySelector(".oc-fog");
  if (!poster) return null;
  const cv = document.createElement("canvas");
  cv.className = "oc-fogcanvas";
  cv.setAttribute("aria-hidden", "true");
  const context = cv.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true, powerPreference: "low-power" });
  if (!context) return null;
  const gl: WebGLRenderingContext = context;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  const lose = () => gl.getExtension("WEBGL_lose_context")?.loseContext();
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    lose();
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(program, "r");
  const uT = gl.getUniformLocation(program, "t");
  poster.after(cv);

  function size() {
    const b = cv.getBoundingClientRect();
    const w = Math.max(64, Math.round(b.width * 0.5));
    const h = Math.max(64, Math.round(b.height * 0.5));
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  const t0 = performance.now() - 40000 * Math.random();
  let raf = 0;
  let last = 0;
  function draw(now: number) {
    size();
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    film.classList.add("is-drawn");
  }
  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (now - last < 32) return;
    last = now;
    draw(now);
  }
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  return {
    // a still frame (reduced motion) is one fixed phase, so it is the same on every load
    once: () => draw(t0 + 20000),
    start: () => {
      if (!raf) raf = requestAnimationFrame(loop);
    },
    stop,
    dispose: () => {
      stop();
      film.classList.remove("is-drawn");
      lose();
      cv.remove();
    },
  };
}
