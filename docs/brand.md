# Brand

## Mark

Assay's mark is the **Row A**: a solid A cut by a horizontal gap. The gap is
the crossbar, a row being checked, drawn as negative space. It names the
product and shows what a check looks at, it reads at 16 px, and the cut gives
the product a motion of its own (on the landing page it sweeps up and down the
A).

It replaced the rhinoceros beetle mascot in October 2026 and lost its indigo
tile in the same month: like the marks it sits beside on the web, it is one
solid shape in one colour.

One source draws it everywhere: `src/lib/brand/mark.ts`.

- `RowAMark` (`src/components/brand/RowAMark.tsx`) in the interface, and
  `BrandMark` for the mark beside the wordmark.
- `src/app/icon.svg`, the favicon, written by the script below.
- `src/app/apple-icon.tsx`, the iOS icon, on a square night tile that iOS rounds.

After changing the mark, regenerate the favicon:

```bash
npx tsx scripts/brand/render-icons.ts
```

## Construction

A 64-unit square. The A is one polygon: apex at (32, 7), feet from x = 7 to 20
and 44 to 57 on y = 57, and the counter's apex at (32, 33). A 2.5-unit stroke in
the same colour softens its corners. A 5-unit gap at y = 30.5 cuts it into a
triangular top and two legs. When the gap moves, it stays between y = 22 and
y = 40.

## Colour

The mark has no colour of its own: in the interface it takes the colour of the
text around it (`foreground`, or `night-foreground` on night). The favicon is
`#070A1A` (night) in a light browser and `#EEF0FF` (night-foreground) in a dark
one; the iOS icon is the light mark on a night tile. Where the mark stands in
for an app icon, as the sender of an alert, it sits on a `primary` tile.

Do not recolour the mark with status colours; green, amber and red mean run
outcomes.

## Type

Geist for the interface and every heading, Geist Mono for code in the app. The
landing page sets its running text and code in its own faces; `DESIGN.md`
(Landing) names them. Chinese falls back to a named system face (PingFang SC,
Microsoft YaHei, Noto Sans SC).
