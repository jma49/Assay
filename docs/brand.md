# Brand

## Mark

Assay's mark is the **Row A**: the initial A, with a crossbar that is a row
being checked. It names the product and shows what a check looks at, it reads
at 16 px, and the crossbar gives the product a motion of its own (on the
landing page it sweeps up and down the A).

It replaced the rhinoceros beetle mascot in October 2026.

One source draws it everywhere: `src/lib/brand/mark.ts`.

- `RowAMark` (`src/components/brand/RowAMark.tsx`) in the interface, and
  `BrandMark` for the mark beside the wordmark.
- `src/app/icon.svg`, the favicon, written by the script below.
- `src/app/apple-icon.tsx`, the iOS icon, on a square tile that iOS rounds.

After changing the mark, regenerate the favicon:

```bash
npx tsx scripts/brand/render-icons.ts
```

## Construction

A 64-unit tile with a 15-unit corner radius. The legs are a 7-unit round
stroke from (19.5, 50) to the apex at (32, 15.5) and back down to (44.5, 50).
The bar is 8 units tall and overshoots the legs by about 10 units on each side;
a 3-unit stroke in the tile colour cuts it from the legs. When the bar moves,
it stays between y = 27 and y = 38, where it still crosses both legs.

## Colour

The mark keeps the same colours in both themes.

| Role | Hex |
|---|---|
| Tile | `#4F63E8` (the light-theme `primary`) |
| A | `#FFFFFF` |
| Bar | `#C3CAFF` (the dark-theme `primary-ink`) |

On the night background the tile stays indigo. Do not recolour the mark with
status colours; green, amber and red mean run outcomes.

## Type

Geist for the interface and every heading, Geist Mono for code in the app. The
landing page sets its running text and code in its own faces; `DESIGN.md`
(Landing) names them. Chinese falls back to a named system face (PingFang SC,
Microsoft YaHei, Noto Sans SC).
