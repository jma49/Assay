/**
 * Assay's mascot: a rhinoceros beetle built from voxels in the
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
  gloss: "#8FAEF2",
  shine: "#DCE6FD",
  pupil: "#0B1636",
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

/** Voxels per design unit: the shapes below are in design units and sampled this finely. */
export const BEETLE_RESOLUTION = 3;

/**
 * A chibi beetle, like a vinyl toy: one round shell with a glossy patch,
 * a big head with big eyes, a thick horn that forks at the top, and short
 * legs. Few parts and a clear silhouette read better than anatomy.
 */
export function beetleVoxels(resolution: number = BEETLE_RESOLUTION): Voxel[] {
  const R = resolution;
  const grid = new Map<string, string>();
  const put = (x: number, y: number, z: number, color: string) => grid.set(`${x},${y},${z}`, color);
  const has = (x: number, y: number, z: number) => grid.has(`${x},${y},${z}`);
  /** Fills a shape given in design units; `color` sees each voxel's design position. */
  const fill = (
    bounds: [number, number, number, number, number, number],
    inside: Shape,
    color: (x: number, y: number, z: number) => string,
    overwrite = true,
  ) => {
    const [x0, x1, y0, y1, z0, z1] = bounds;
    for (let x = Math.floor(x0 * R); x <= Math.ceil(x1 * R); x++) {
      for (let y = Math.floor(y0 * R); y <= Math.ceil(y1 * R); y++) {
        for (let z = Math.floor(z0 * R); z <= Math.ceil(z1 * R); z++) {
          const [dx, dy, dz] = [x / R, y / R, z / R];
          if (inside(dx, dy, dz) && (overwrite || !has(x, y, z))) put(x, y, z, color(dx, dy, dz));
        }
      }
    }
  };
  const ball = (cx: number, cy: number, cz: number, r: number, color: string, overwrite = true) =>
    fill([cx - r, cx + r, cy - r, cy + r, cz - r, cz + r], ellipsoid(cx, cy, cz, r, r, r), () => color, overwrite);
  /** A tube along a polyline in design units. */
  const line = (points: [number, number, number][], radius: number, color: string, overwrite = true) => {
    const scaled = points.map(([x, y, z]) => [x * R, y * R, z * R] as [number, number, number]);
    for (const key of tube(scaled, Math.max(0, Math.round(radius * R)))) {
      const [x, y, z] = key.split(",").map(Number);
      if (overwrite || !has(x, y, z)) put(x, y, z, color);
    }
  };

  // The shell: one round dome, cut flat underneath, darker towards the belly.
  const shell = ellipsoid(0, 3, 0, 6.6, 4.4, 5.3);
  fill([-7, 7, 1.2, 7.5, -5.5, 5.5], (x, y, z) => y >= 1.2 && shell(x, y, z), (_x, y) =>
    y < 2.2 ? BEETLE_COLORS.shellDark : BEETLE_COLORS.shell,
  );

  // A toy-like gloss: one soft patch high on the shell, with a small bright spot.
  const glossAt = (x: number, y: number, z: number, cx: number, cy: number, cz: number, r: number) =>
    (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 <= r * r;
  for (const key of [...grid.keys()]) {
    const [x, y, z] = key.split(",").map(Number);
    const [dx, dy, dz] = [x / R, y / R, z / R];
    if (grid.get(key) !== BEETLE_COLORS.shell) continue;
    if (glossAt(dx, dy, dz, -1.6, 6.4, 2.6, 1.1)) put(x, y, z, BEETLE_COLORS.shine);
    else if (glossAt(dx, dy, dz, -1.4, 6.2, 2.4, 2.6)) put(x, y, z, BEETLE_COLORS.gloss);
  }

  // Grooves: down the middle of the wing cases, and across where the shield behind the head begins.
  for (const key of [...grid.keys()]) {
    const [x, y, z] = key.split(",").map(Number);
    const [dx, dy, dz] = [x / R, y / R, z / R];
    const surface = !has(x, y + 1, z) || !has(x, y, z + 1) || !has(x, y, z - 1) || !has(x + 1, y, z);
    if (!surface || dy < 2.2) continue;
    if ((Math.abs(dz) < 0.2 && dx < 2.6) || (dx >= 2.6 && dx < 3.05)) put(x, y, z, BEETLE_COLORS.seam);
  }

  // The head: big and dark, pushed forward under the shield.
  fill([4.6, 9.6, 0.8, 5, -3, 3], ellipsoid(7.2, 2.8, 0, 2.3, 2, 2.6), () => BEETLE_COLORS.shellDark);

  // Big eyes: white with a dark pupil looking forward.
  for (const side of [-1, 1]) {
    ball(8.4, 3.4, side * 1.7, 0.95, BEETLE_COLORS.eye);
    ball(9.05, 3.5, side * 1.75, 0.5, BEETLE_COLORS.pupil);
  }

  // The horn: thick from the forehead, rising and forking at the top.
  line(
    [
      [8.6, 4, 0],
      [9.9, 6, 0],
      [10.3, 8.6, 0],
      [9.8, 10.6, 0],
    ],
    1,
    BEETLE_COLORS.horn,
  );
  line(
    [
      [9.8, 10.6, 0],
      [8.7, 12, 0],
    ],
    0.55,
    BEETLE_COLORS.hornTip,
  );
  line(
    [
      [9.8, 10.6, 0],
      [11, 12.1, 0],
    ],
    0.55,
    BEETLE_COLORS.hornTip,
  );

  // A short horn on the shield, pointing forward.
  line(
    [
      [3.8, 6.8, 0],
      [5.6, 7.3, 0],
      [6.6, 6.9, 0],
    ],
    0.55,
    BEETLE_COLORS.horn,
  );

  // Six short legs, splayed a little.
  for (const legX of [4.6, 0.6, -3.6]) {
    for (const side of [-1, 1]) {
      line(
        [
          [legX, 1.8, side * 3.8],
          [legX + 0.4, 1.2, side * 5.6],
          [legX + 0.9, 0.1, side * 6.1],
        ],
        0.5,
        BEETLE_COLORS.leg,
        false,
      );
    }
  }

  // Voxels enclosed on all six sides can never be seen; dropping them keeps the mesh small.
  const visible = [...grid.entries()].filter(([key]) => {
    const [x, y, z] = key.split(",").map(Number);
    return !(
      has(x + 1, y, z) &&
      has(x - 1, y, z) &&
      has(x, y + 1, z) &&
      has(x, y - 1, z) &&
      has(x, y, z + 1) &&
      has(x, y, z - 1)
    );
  });
  return visible.map(([key, color]) => {
    const [x, y, z] = key.split(",").map(Number);
    return { x, y, z, color };
  });
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
      // A round shell, cut flat underneath, darker along the belly.
      if (y <= 18 && inEllipse(x, y, 9, 15.5, 7.6, 7)) paint(x, y, y === 18 ? BEETLE_COLORS.shellDark : BEETLE_COLORS.shell);
    }
  }
  // The head, big and dark, in front of the shell.
  for (let y = 0; y < size; y++) {
    for (let x = 14; x < size; x++) {
      if (y <= 18 && inEllipse(x, y, 18.6, 16, 2.9, 2.7)) paint(x, y, BEETLE_COLORS.shellDark);
    }
  }
  // Gloss: a soft patch high on the shell with a bright spot.
  for (const [x, y] of [[6, 11], [7, 11], [8, 11], [5, 12], [6, 12], [9, 11], [5, 13]]) paint(x, y, BEETLE_COLORS.gloss);
  for (const [x, y] of [[6, 12], [7, 12]]) paint(x, y, BEETLE_COLORS.shine);
  // The groove where the shield behind the head begins.
  for (let y = 10; y <= 17; y++) paint(13, y, BEETLE_COLORS.seam);

  // A big eye looking forward.
  for (const [x, y] of [[19, 15], [20, 15], [19, 16], [20, 16]]) paint(x, y, "#FFFFFF");
  paint(20, 16, BEETLE_COLORS.pupil);

  // The horn: up from the forehead, forking at the top.
  for (const [x, y] of [[20, 13], [21, 13], [21, 12], [21, 11], [21, 10], [21, 9], [21, 8], [21, 7]]) paint(x, y, BEETLE_COLORS.horn);
  for (const [x, y] of [[20, 6], [19, 5], [22, 6], [23, 5]]) paint(x, y, BEETLE_COLORS.hornTip);

  // Three short legs on the near side.
  for (const [x, y] of [[4, 19], [3, 20], [9, 19], [9, 20], [14, 19], [15, 20]]) paint(x, y, BEETLE_COLORS.leg);
  return centered(grid);
}

/** Moves the drawing so its bounding box sits in the middle of the grid. */
function centered(grid: (string | null)[][]): (string | null)[][] {
  const size = grid.length;
  const cells = grid.flatMap((row, y) => row.flatMap((color, x) => (color ? [[x, y]] : [])));
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const dx = Math.floor((size - (Math.max(...xs) - Math.min(...xs) + 1)) / 2) - Math.min(...xs);
  const dy = Math.floor((size - (Math.max(...ys) - Math.min(...ys) + 1)) / 2) - Math.min(...ys);
  const out: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  grid.forEach((row, y) => row.forEach((color, x) => color && (out[y + dy][x + dx] = color)));
  return out;
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
  // A margin so the horn and shell never touch the tile's rounded edge.
  const pad = 2.5;
  const side = n + pad * 2;
  const background = tile ? `<rect x="${-pad}" y="${-pad}" width="${side}" height="${side}" rx="${side * 0.22}" fill="${tile}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${side} ${side}" width="${size}" height="${size}" shape-rendering="crispEdges">${background}${rects.join("")}</svg>`;
}
