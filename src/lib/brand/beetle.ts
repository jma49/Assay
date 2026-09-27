/**
 * Assay's mascot: a rhinoceros beetle (独角仙) built from voxels in the
 * brand's cobalt. One model feeds both the 3D figure on the landing page
 * and the pixel icon (a side view of the same voxels), so they always match.
 *
 * Axes: x runs tail (−) to head (+), y is up, z is left–right. The beetle
 * is symmetric in z.
 */

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
}

export const BEETLE_COLORS = {
  shellLight: "#5B82E6",
  shell: "#2350C8",
  shellDark: "#1A3D9E",
  seam: "#12296B",
  horn: "#16307A",
  hornTip: "#2B4FA8",
  leg: "#0F2257",
  eye: "#EAF0FD",
} as const;

type Shape = (x: number, y: number, z: number) => boolean;

const ellipsoid =
  (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): Shape =>
  (x, y, z) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1;

/** Voxels along a polyline, `radius` thick in y and z. */
function tube(points: [number, number, number][], radius: number): Set<string> {
  const cells = new Set<string>();
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay, az] = points[i];
    const [bx, by, bz] = points[i + 1];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay), Math.abs(bz - az)) * 3;
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const pz = az + (bz - az) * t;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dy * dy + dz * dz <= radius * radius + 0.25) {
            cells.add(`${Math.round(px)},${Math.round(py + dy)},${Math.round(pz + dz)}`);
          }
        }
      }
    }
  }
  return cells;
}

export function beetleVoxels(): Voxel[] {
  const grid = new Map<string, string>();
  const put = (x: number, y: number, z: number, color: string) => grid.set(`${x},${y},${z}`, color);
  const has = (x: number, y: number, z: number) => grid.has(`${x},${y},${z}`);

  // Elytra (wing cases): a long dome, flattened underneath.
  const elytra = ellipsoid(-1, 3, 0, 8, 4.2, 5.5);
  // Pronotum: the domed shield behind the head.
  const pronotum = ellipsoid(8, 3.6, 0, 3.6, 3.4, 4.6);
  const head = ellipsoid(11.6, 2.6, 0, 2.2, 1.9, 2.4);

  for (let x = -10; x <= 14; x++) {
    for (let y = 1; y <= 8; y++) {
      for (let z = -6; z <= 6; z++) {
        if (elytra(x, y, z)) put(x, y, z, BEETLE_COLORS.shell);
        else if (pronotum(x, y, z)) put(x, y, z, BEETLE_COLORS.shell);
        else if (head(x, y, z)) put(x, y, z, BEETLE_COLORS.shellDark);
      }
    }
  }

  // Light catches the top of the shell; the seam between the wing cases runs down the back.
  for (const key of [...grid.keys()]) {
    const [x, y, z] = key.split(",").map(Number);
    if (!has(x, y + 1, z) && grid.get(key) === BEETLE_COLORS.shell) put(x, y, z, BEETLE_COLORS.shellLight);
  }
  for (let x = -9; x <= 4; x++) {
    let top = -1;
    for (let y = 8; y >= 1; y--) {
      if (has(x, y, 0)) {
        top = y;
        break;
      }
    }
    if (top > 0) put(x, top, 0, BEETLE_COLORS.seam);
  }

  // The long head horn sweeps forward, rises and curls back, forking at the tip.
  const headHorn = tube(
    [
      [13, 3, 0],
      [16, 4, 0],
      [18, 6, 0],
      [19, 9, 0],
      [19, 12, 0],
      [18, 14, 0],
    ],
    1,
  );
  for (const key of headHorn) {
    const [x, y, z] = key.split(",").map(Number);
    put(x, y, z, y >= 11 ? BEETLE_COLORS.hornTip : BEETLE_COLORS.horn);
  }
  for (const [x, y] of [
    [17, 15],
    [16, 16],
    [19, 15],
    [20, 16],
  ]) {
    put(x, y, 0, BEETLE_COLORS.hornTip);
  }

  // The shorter thorax horn leans forward over the head, forked at its end.
  for (const key of tube(
    [
      [9, 6, 0],
      [11, 7, 0],
      [13, 7, 0],
    ],
    0,
  )) {
    const [x, y, z] = key.split(",").map(Number);
    put(x, y, z, BEETLE_COLORS.horn);
  }
  put(14, 6, -1, BEETLE_COLORS.hornTip);
  put(14, 6, 1, BEETLE_COLORS.hornTip);

  // Eyes on either side of the head.
  put(12, 3, -2, BEETLE_COLORS.eye);
  put(12, 3, 2, BEETLE_COLORS.eye);

  // Three legs a side: out from the body, then down to the ground.
  for (const [hipX, footX] of [
    [9, 12],
    [3, 3],
    [-3, -6],
  ] as const) {
    for (const side of [-1, 1]) {
      for (const key of tube(
        [
          [hipX, 2, side * 3],
          [hipX + (footX - hipX) / 2, 3, side * 6],
          [footX, 0, side * 8],
        ],
        0,
      )) {
        const [x, y, z] = key.split(",").map(Number);
        if (!has(x, y, z)) put(x, y, z, BEETLE_COLORS.leg);
      }
    }
  }

  return [...grid.entries()].map(([key, color]) => {
    const [x, y, z] = key.split(",").map(Number);
    return { x, y, z, color };
  });
}

/**
 * The side view as a pixel grid: for every (x, y), the voxel nearest the
 * viewer. Rows run top to bottom; empty cells are null.
 */
export function beetleSideView(voxels: Voxel[] = beetleVoxels()) {
  const xs = voxels.map((v) => v.x);
  const ys = voxels.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const front = new Map<string, Voxel>();
  for (const voxel of voxels) {
    const key = `${voxel.x},${voxel.y}`;
    const current = front.get(key);
    if (!current || voxel.z > current.z) front.set(key, voxel);
  }
  const rows: (string | null)[][] = [];
  for (let y = maxY; y >= minY; y--) {
    const row: (string | null)[] = [];
    for (let x = minX; x <= maxX; x++) row.push(front.get(`${x},${y}`)?.color ?? null);
    rows.push(row);
  }
  return rows;
}

/**
 * The pixel icon, drawn for small sizes rather than projected from the 3D
 * model: a projected side view flattens the domed back into a line. It keeps
 * what makes the beetle readable at 16px: a high dome, the forked horn
 * curling up over the head, and legs. Same palette as the voxel figure.
 */
export function beetleIconGrid(): (string | null)[][] {
  const size = 24;
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const paint = (x: number, y: number, color: string) => {
    if (x >= 0 && x < size && y >= 0 && y < size) grid[y][x] = color;
  };
  const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
    ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Wing cases: a high dome, cut flat underneath.
      if (y <= 17 && inEllipse(x, y, 9, 18.5, 8, 8.5)) paint(x, y, BEETLE_COLORS.shell);
      // Pronotum, then the head in front of it.
      else if (y <= 17 && inEllipse(x, y, 16, 15.5, 3, 3.2)) paint(x, y, BEETLE_COLORS.shellDark);
      else if (y <= 17 && inEllipse(x, y, 19, 16, 1.8, 1.6)) paint(x, y, BEETLE_COLORS.horn);
    }
  }
  // Highlight along the top of the dome, and the seam between the wing cases.
  for (let x = 0; x < size; x++) {
    const top = grid.findIndex((row) => row[x] === BEETLE_COLORS.shell);
    if (top >= 0) paint(x, top, BEETLE_COLORS.shellLight);
  }
  for (let y = 11; y <= 15; y++) paint(12, y, BEETLE_COLORS.seam);

  // Head horn: forward from the head, up, then forked at the top.
  for (const [x, y] of [
    [20, 15], [20, 14], [21, 13], [21, 12], [21, 11], [21, 10], [21, 9], [21, 8], [21, 7],
    [20, 6], [22, 6], [19, 5], [23, 5],
  ]) {
    paint(x, y, y <= 8 ? BEETLE_COLORS.hornTip : BEETLE_COLORS.horn);
  }
  // Thorax horn leaning over the head.
  for (const [x, y] of [[16, 12], [17, 11], [18, 11], [19, 12]]) paint(x, y, BEETLE_COLORS.horn);
  paint(18, 15, BEETLE_COLORS.eye);

  // Legs: three visible on the near side.
  for (const [x, y] of [
    [5, 18], [4, 19], [3, 20],
    [10, 18], [10, 19], [10, 20],
    [16, 18], [17, 19], [18, 20],
  ]) {
    paint(x, y, BEETLE_COLORS.leg);
  }
  return grid;
}

/** The icon as SVG, on a rounded tile unless `tile` is null. */
export function beetleIconSvg({ size = 64, tile = "#EAF0FD" }: { size?: number; tile?: string | null } = {}): string {
  const grid = beetleIconGrid();
  const n = grid.length;
  const rects: string[] = [];
  grid.forEach((row, y) =>
    row.forEach((color, x) => {
      if (color) rects.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${color}"/>`);
    }),
  );
  const background = tile ? `<rect width="${n}" height="${n}" rx="${n * 0.22}" fill="${tile}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges">${background}${rects.join("")}</svg>`;
}
