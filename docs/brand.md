# Brand

## Mascot

Assay's mascot is a rhinoceros beetle (独角仙): small, armoured, and strong
for its size, which is what a data check should be. It is drawn as a chibi
toy rather than an anatomical study: one round glossy shell, a big head with
big eyes, a thick horn that forks at the top, and short legs. It exists in
two forms, both in `src/lib/brand/beetle.ts`:

- **Voxel figure** (`beetleVoxels`) for the landing page, rendered by
  `src/components/brand/VoxelBeetle.tsx` with three.js. It spins in once,
  then turns slowly, and under a mouse it turns to follow the pointer. With
  reduced motion there is no spin-in or idle turn, but it still follows the
  mouse, since that motion is the visitor's own.
  three.js loads only where the figure is shown.
- **Pixel icon** (`beetleIconGrid`), drawn for small sizes in the same chibi
  style: round shell with a gloss, big eye, forked horn, three legs. It is the favicon, the iOS icon and
  the mark beside the wordmark (`BeetleMark`, `BrandMark`).

After changing the icon, regenerate the favicon:

```bash
npx tsx scripts/brand/render-icons.ts
```

Both are original work. Do not replace them with third-party models or icons
without checking the licence.

## Colour

The beetle uses the cobalt ramp of the interface accent:

| Role | Hex |
|---|---|
| Shell highlight | `#5B82E6` |
| Shell | `#2350C8` (the interface accent) |
| Head and pronotum shadow | `#1A3D9E` |
| Horn | `#16307A`, tip `#2B4FA8` |
| Legs | `#0F2257` |
| Gloss and shine | `#8FAEF2`, `#DCE6FD` |
| Eye, pupil | white, `#0B1636` |
| Tile behind the icon | `#EAF0FD` (the accent's soft tint) |

## Type

Manrope for everything readable: interface text at 400–600, headings at
600–700 with slightly tight letter-spacing (`font-display`). Its round forms
suit the chibi mascot and stay clear in dense tables. JetBrains Mono for
code, ids and cron expressions. Chinese falls back to the system face
(PingFang SC, Microsoft YaHei, Noto Sans SC / Noto Sans CJK SC).
