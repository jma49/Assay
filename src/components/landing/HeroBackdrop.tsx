/**
 * Hero artwork: warm glows over deep ink with faint contour lines, a nod to
 * measuring. Pure SVG/CSS so it costs no image download.
 */

const WIDTH = 1440;
const HEIGHT = 720;

// Deterministic wavy contour lines, each a smooth cubic path across the width.
function contourPaths(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const y = 60 + i * (HEIGHT / count);
    const amp = 18 + (i % 5) * 7;
    const shift = (i * 137) % 360;
    const points = Array.from({ length: 9 }, (_, j) => {
      const x = (j / 8) * WIDTH;
      const phase = ((j * 45 + shift) * Math.PI) / 180;
      return [x, y + Math.sin(phase) * amp + Math.cos(phase / 2) * amp * 0.4];
    });
    let d = `M ${points[0][0]} ${points[0][1].toFixed(1)}`;
    for (let j = 1; j < points.length; j++) {
      const [x0, y0] = points[j - 1];
      const [x1, y1] = points[j];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0.toFixed(1)}, ${cx} ${y1.toFixed(1)}, ${x1} ${y1.toFixed(1)}`;
    }
    return d;
  });
}

const PATHS = contourPaths(16);

export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 18% 20%, rgba(214, 162, 26, 0.28), transparent 70%)," +
            "radial-gradient(55% 60% at 85% 35%, rgba(63, 125, 88, 0.30), transparent 70%)," +
            "radial-gradient(50% 50% at 50% 100%, rgba(181, 74, 60, 0.18), transparent 70%)," +
            "linear-gradient(180deg, #1b1a19 0%, #221f1c 100%)",
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {PATHS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(243, 239, 232, 0.07)" strokeWidth={1} />
        ))}
      </svg>
    </div>
  );
}
