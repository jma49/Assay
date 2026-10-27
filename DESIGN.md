---
version: alpha
name: Assay
description: "The Assay app in the landing page world: a dark warm room framing one lit light box, with film for results. Light only (the face is the working surface), square-ish 4px corners, Sofia Sans and Maple Mono, and one accent, lumen, that means only a row a check returned."
colors:
  primary: "#121619"
  on-primary: "#F7FAFA"
  primary-soft: "#DFE5E7"
  primary-ink: "#121619"
  background: "#EEF2F3"
  foreground: "#121619"
  card: "#F7FAFA"
  sidebar: "#19130F"
  muted: "#E4EAEC"
  muted-foreground: "#4F5356"
  subtle-foreground: "#5C6063"
  border: "#D4DCDF"
  border-strong: "#B9C3C7"
  success: "#3D4347"
  success-soft: "#E4EAEC"
  attention: "#0B5A80"
  attention-soft: "#DFF3FF"
  failure: "#A3261F"
  failure-soft: "#F6E1DE"
  code-bg: "#E4EAEC"
  paper: "#EEF2F3"
  paper-raised: "#F7FAFA"
  rule: "#D4DCDF"
  rule-strong: "#B9C3C7"
  ink: "#121619"
  ink-muted: "#4F5356"
  room-950: "#0E0A07"
  room-900: "#19130F"
  room-800: "#2A211A"
  room-ink: "#F2ECE5"
  room-ink-2: "#B7AEA5"
  room-ink-3: "#A29A92"
  face: "#EEF2F3"
  face-hi: "#F7FAFA"
  face-lo: "#E4EAEC"
  line: "#D4DCDF"
  line-2: "#B9C3C7"
  lumen: "#9FDCFF"
  lumen-ink: "#0B5A80"
  lit-still: "#DFF3FF"
  safelight: "#A3261F"
  lt-room-1000: "#080605"
  lt-room-950: "#0E0A07"
  lt-room-900: "#19130F"
  lt-room-800: "#2A211A"
  lt-room-ink: "#F2ECE5"
  lt-box: "#EEF2F3"
  lt-box-hi: "#F7FAFA"
  lt-box-ink: "#121619"
  lt-box-edge: "#D9E0E3"
  lt-box-shade: "#C9D1D5"
  lt-film-950: "#121618"
  lt-film-900: "#1B2124"
  lt-film-print: "#C6D0D5"
  lt-film-print-hi: "#E4EBEE"
  lt-lead-700: "#474E52"
  lt-lead-600: "#5B6266"
  lt-lead-ink: "#F4F4F0"
  lt-day: "#E6E6E2"
  lt-day-hi: "#F0F0EC"
  lt-day-white: "#FFFFFF"
  lt-day-ink: "#16181A"
  lt-lumen: "#9FDCFF"
  lt-lumen-core: "#F1FBFF"
  lt-lumen-ink: "#0B5A80"
  lt-fog-950: "#2A2F32"
  lt-fog-hi: "#B9C0C3"
  lt-fog-ink: "#E9ECEC"
  lt-fog-ink-dark: "#15191B"
  lt-metal-900: "#24282B"
  lt-metal-300: "#AEB5B9"
  lt-chat-bg: "#FFFFFF"
  lt-chat-ink: "#1D1C1D"
typography:
  display-2xl:
    fontFamily: Sofia Sans
    fontSize: 88px
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: -0.045em
  display-xl:
    fontFamily: Sofia Sans
    fontSize: 60px
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: -0.035em
  display-lg:
    fontFamily: Sofia Sans
    fontSize: 38px
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: -0.03em
  display-md:
    fontFamily: Sofia Sans
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.03em
  display-sm:
    fontFamily: Sofia Sans
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline:
    fontFamily: Sofia Sans
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.02em
  title:
    fontFamily: Sofia Sans
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Sofia Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: Sofia Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 26px
  body-md:
    fontFamily: Sofia Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
  body-sm:
    fontFamily: Sofia Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  caption:
    fontFamily: Sofia Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  label-caps:
    fontFamily: Sofia Sans
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.06em
  stat:
    fontFamily: Sofia Sans
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.03em
    fontFeature: '"tnum" 1'
  code:
    fontFamily: Maple Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.65
rounded:
  none: 0px
  sm: 4px
  full: 9999px
spacing:
  unit: 4px
  control-height: 36px
  control-height-sm: 32px
  control-height-lg: 44px
  content-max: 1600px
  card-padding: 20px
  sidebar-width: 232px
  shell-bar-height: 52px
  status-dot: 8px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-md}"
  face:
    backgroundColor: "{colors.face}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "{spacing.card-padding}"
  secondary-text:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-sm}"
  sidebar-label:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.room-ink-2}"
    typography: "{typography.label-caps}"
  status-dot-idle:
    backgroundColor: "{colors.subtle-foreground}"
    size: "{spacing.status-dot}"
    rounded: "{rounded.full}"
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.card}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: "{spacing.control-height}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "{spacing.control-height}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "{spacing.control-height}"
  input-border:
    backgroundColor: "{colors.border-strong}"
  divider:
    backgroundColor: "{colors.border}"
  face-hairline:
    backgroundColor: "{colors.line}"
  nav-item-active:
    backgroundColor: "{colors.room-800}"
    textColor: "{colors.room-ink}"
    rounded: "{rounded.sm}"
  nav-item-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.sm}"
  segmented-track:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
  issues-word:
    backgroundColor: "{colors.face}"
    textColor: "{colors.lumen-ink}"
    typography: "{typography.body-sm}"
  broken-word:
    backgroundColor: "{colors.face}"
    textColor: "{colors.safelight}"
    typography: "{typography.body-sm}"
  sheet-muted:
    backgroundColor: "{colors.face-lo}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  inline-code:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
  badge-clean:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  badge-issues:
    backgroundColor: "{colors.attention-soft}"
    textColor: "{colors.attention}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  badge-error:
    backgroundColor: "{colors.failure-soft}"
    textColor: "{colors.failure}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  status-dot:
    size: "{spacing.status-dot}"
    rounded: "{rounded.full}"
  film:
    backgroundColor: "{colors.lt-film-900}"
    textColor: "{colors.lt-film-print}"
    typography: "{typography.code}"
    rounded: "{rounded.sm}"
  returned-row:
    backgroundColor: "{colors.lumen}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
  still-open-row:
    backgroundColor: "{colors.lit-still}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
  code-block:
    backgroundColor: "{colors.lt-film-900}"
    textColor: "{colors.lt-film-print}"
    typography: "{typography.code}"
    rounded: "{rounded.sm}"
  demo-banner:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.room-ink-3}"
    typography: "{typography.body-sm}"
  demo-banner-title:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.room-ink}"
  popover:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
  panel-ring:
    backgroundColor: "{colors.line-2}"
  panel-ring-hover:
    backgroundColor: "{colors.ink}"
  auth-brand-panel:
    backgroundColor: "{colors.room-950}"
    textColor: "{colors.room-ink}"
    typography: "{typography.body-sm}"
  auth-brand-panel-muted:
    backgroundColor: "{colors.room-950}"
    textColor: "{colors.room-ink-3}"
  auth-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  room:
    backgroundColor: "{colors.room-900}"
    textColor: "{colors.room-ink}"
  room-frame:
    backgroundColor: "{colors.room-950}"
    textColor: "{colors.room-ink-2}"
  paper-rule:
    backgroundColor: "{colors.rule}"
  paper-rule-strong:
    backgroundColor: "{colors.rule-strong}"
  muted-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
  landing-room:
    backgroundColor: "{colors.lt-room-950}"
    textColor: "{colors.lt-room-ink}"
  landing-room-dark:
    backgroundColor: "{colors.lt-room-1000}"
    textColor: "{colors.lt-room-ink}"
  landing-room-ground:
    backgroundColor: "{colors.lt-room-900}"
    textColor: "{colors.lt-room-ink}"
  landing-room-raised:
    backgroundColor: "{colors.lt-room-800}"
    textColor: "{colors.lt-room-ink}"
  landing-room-button:
    backgroundColor: "{colors.lt-room-ink}"
    textColor: "{colors.lt-room-900}"
  landing-box:
    backgroundColor: "{colors.lt-box}"
    textColor: "{colors.lt-box-ink}"
  landing-box-centre:
    backgroundColor: "{colors.lt-box-hi}"
    textColor: "{colors.lt-box-ink}"
  landing-box-edge:
    backgroundColor: "{colors.lt-box-edge}"
    textColor: "{colors.lt-box-ink}"
  landing-box-frame:
    backgroundColor: "{colors.lt-box-shade}"
    textColor: "{colors.lt-box-ink}"
  landing-box-button:
    backgroundColor: "{colors.lt-box-ink}"
    textColor: "{colors.lt-box-hi}"
  landing-film:
    backgroundColor: "{colors.lt-film-900}"
    textColor: "{colors.lt-film-print}"
  landing-film-dense:
    backgroundColor: "{colors.lt-film-950}"
    textColor: "{colors.lt-film-print-hi}"
  landing-returned-row:
    backgroundColor: "{colors.lt-lumen-core}"
    textColor: "{colors.lt-film-950}"
  landing-lumen-on-film:
    backgroundColor: "{colors.lt-film-950}"
    textColor: "{colors.lt-lumen}"
  landing-returned-count:
    backgroundColor: "{colors.lt-box-hi}"
    textColor: "{colors.lt-lumen-ink}"
  landing-lead:
    backgroundColor: "{colors.lt-lead-600}"
    textColor: "{colors.lt-lead-ink}"
  landing-lead-deep:
    backgroundColor: "{colors.lt-lead-700}"
    textColor: "{colors.lt-lead-ink}"
  landing-lead-button:
    backgroundColor: "{colors.lt-lead-ink}"
    textColor: "{colors.lt-lead-700}"
  landing-daylight:
    backgroundColor: "{colors.lt-day}"
    textColor: "{colors.lt-day-ink}"
  landing-daylight-raised:
    backgroundColor: "{colors.lt-day-white}"
    textColor: "{colors.lt-day-ink}"
  landing-daylight-button:
    backgroundColor: "{colors.lt-day-ink}"
    textColor: "{colors.lt-day-hi}"
  landing-fog:
    backgroundColor: "{colors.lt-fog-950}"
    textColor: "{colors.lt-fog-ink}"
  landing-fog-lit:
    backgroundColor: "{colors.lt-fog-hi}"
    textColor: "{colors.lt-fog-ink-dark}"
  landing-metal:
    backgroundColor: "{colors.lt-metal-900}"
    textColor: "{colors.lt-metal-300}"
  landing-alert:
    backgroundColor: "{colors.lt-chat-bg}"
    textColor: "{colors.lt-chat-ink}"
  stat-tile:
    backgroundColor: "{colors.face-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.stat}"
    rounded: "{rounded.sm}"
---

# Assay

`src/app/globals.css` holds the values; this file mirrors them and says how to use them. Change a token in both, in the same commit.

## Overview

Assay is a tool people open when something might be wrong with their data. It should feel calm, precise and current, not like an enterprise console. Most screens are tables, lists and detail panes read by engineers and analysts, in English and Chinese. The app, the docs and sign-in share one world: a dark warm room framing one lit opal working face, the light box. Results are strips of developed film; the rows a check returned are the only marks of light. Light only: the face is the working surface, there is no dark mode and no theme switch. The landing page (see [Landing](#landing)) is the same world at full scale; the app is its working face.

Three ideas decide most calls: **one light** (lumen means a returned row, and nothing else), **quiet** (the data is loud, the chrome is not), **consistent** (a status looks identical everywhere).

## Colors

- **Lumen (`lumen`, `lumen-core`, `lumen-ink`, `lit-still`, `lit-edge`) means one thing: a row a check returned.** It fills the returned row, marks the lit window in an outcome glyph and the lit frames in a run strip. It is never a link, button, focus ring, selection, nav state or decoration. As text on the face it is `lumen-ink`, not the pale fill.
- **The room and the face.** `room-950`, `room-900`, `room-800`, `room-ink*` and `room-line*` are the dark frame: the rail, the top bar, the docs header, the sign-in room. `face`, `face-hi`, `face-lo`, `ink*`, `line` and `line-2` are the lit working surface. `background` is the face and `sidebar` is the room, so a primitive placed anywhere inherits the right ground.
- **Status colours are semantic and fixed:** `failure` = Broken (the query failed, the darkroom's safelight red `#A3261F`), `attention` = Issues (it returned rows, in `lumen-ink`), `success` = Clean (it returned none, quiet ink). Each has a `-soft` background tint. They never decorate and are never swapped for the accent.
- **There is no green and no indigo.** Links are ink and underlined; the current page is a lit cell with an ink edge; focus rings use the ground's own ink (face ink on the face, room ink on the room and on film).
- **`subtle-foreground` is never text**, not even a "—": it is below AA. Use it for marks only (the idle dot, list markers). The quietest text is `ink-3` on the face and `room-ink-3` on the room.
- **Light only.** No dark theme, theme switch, `.dark` class or `dark:` variant; a dark system setting renders the same page.
- Colours reach components only through the utilities in `@theme inline` (`bg-card`, `text-ink-2`, `text-attention`, `bg-room-900`, …). No hex values or raw palette classes (`text-blue-600`).
- Every text pair meets WCAG AA (4.5:1); the lint below checks every component pair in the front matter.

## Typography

- **Faces.** Sofia Sans for everything readable, headings at 600 and tight. Sofia Sans Condensed 800 capitals for lead markings only: film edges, diff tags, role plates, READ-ONLY stamps, rail group labels. Maple Mono NL (no ligatures, regular) for SQL, rows, ids, cron expressions and timestamps. All SIL OFL, self-hosted through `next/font` in `src/components/type/fonts.ts`, shared with the landing. No Geist, Instrument Serif or Figtree.
- **Chinese** falls back to PingFang SC, Microsoft YaHei, then Noto Sans SC / Noto Sans CJK SC. Never leave CJK to `system-ui`: it picks a font by page language, which the language switch sets only after hydration, so Chinese could render with Japanese glyphs.
- **The scale** in the front matter is the whole set of sizes, used as `text-<level>` utilities (see [Type scale rules](#type-scale-rules)):
  - `display-sm`: the shell's page title and a run's headline. `headline`: a check's or panel's name. `display-lg`: docs article titles.
  - `headline`, `title`, `title-sm`: section, card and dialog titles.
  - `body-md` (15px): the page default and the rail. `body-sm` (14px): tables, buttons, form controls. `body-lg` (16px): docs prose.
  - `caption` (13px): metadata, timestamps, helpers; the floor for any text.
  - `.lead` (Sofia Sans Condensed 800 capitals, 13px, +0.08em): markings, never running text. `label-caps` remains for small form-section labels.
  - `stat`: big numbers in the stat tiles, tabular figures.
- **Weights:** 400 body, 500 for emphasis and `stat`, 600 for headings, 800 for lead markings.
- Body, `caption` and `label-caps` line heights are whole even pixels, so mixed levels centred in one row share a baseline. Chinese reading text takes 1.75 leading.

## Layout

- Spacing follows Tailwind's 4px scale; prefer 2, 3, 4, 6 and 8, and odd steps only to align with a neighbour.
- App pages sit in `APP_CONTAINER` (`max-w-[1600px]`, centred, 20–28px side padding). The shell is a dark room: a 232px rail, a 52px top bar carrying the section, the demo notice and the language switch, and inside them one lit face (`.app-face`) that holds every page. The rail's current item is a raised cell with an ink edge and a lead role plate at its foot.
- A page is a shell over a data hook and section components. The shell draws the heading from `app-shell-routes.ts`, closed by a hairline: page title, optional count (`WindowStatusBar`), a one-line intro, actions on the right (`WindowToolbar`). Pages about one thing (a check, a run) show a "‹ back to the list" link and draw their own heading. Then a stat strip or filters, then the list.
- On Checks the stat tiles are the filter (a lit tile has an ink rule on its bottom edge), and a chosen check opens beside the list (`?check=`, from 1280px, 460px wide, as a sheet; a drawer below) with the same tabs as its own page. Each row leads with its outcome glyph and prints the outcome as a word, never a coloured pill.
- Controls are 36px (`h-9`), 32px compact, 44px for large calls to action; search fields in a page heading are 36–40px.
- Must work at 375px without horizontal page scroll; wide tables scroll inside their own container, and film rows stack or scroll inside the film, never the page.

## Elevation & Depth

The face is lit, not raised: `.app-face` is a radial face-hi to face-lo with an inner lip, and panels are flat sheets inside a `line-2` hairline (`.panel-sheet`; `shadow-border` is the 1px ring that never shifts layout). Only film lifts, with a short dark shadow under it, because it is an object laid on the box. `shadow-md` is for things that float: popovers, menus, dropdowns, toasts. No glass, no blur, no decorative glow.

## Shapes

Square-ish. `--radius` is 4px, so `rounded-sm|md|lg|xl` all draw 4px, and `rounded-none` survives only where a primitive needs it. `rounded-full` is for status dots, marker dots and avatars. Films and slips take 4px with a 2px inner frame; important panels may carry registration marks (`corners`). No arbitrary radii.

## Components

- Use the shadcn primitives in `src/components/ui` (new-york, Radix). Add a variant before writing a one-off; never fork a primitive's styles into a page.
- **Buttons:** ink (`bg-foreground text-background`) for the main action, a `line-2` outline on the face for the secondary one, ghost for quiet ones. Lumen is never a button.
- **Segmented filters:** stat tiles are one joined plate; a chosen tile is `face-hi` with a 3px ink rule along its bottom edge. Tabs are a text row with an ink underline, never pills.
- **Status:** `.outcome-glyph` + `outcome-glyph-{error|issues|clean|none}` (film state: fog, a lit row, clear film, an empty slot), always printed beside its word. `.status-dot` remains for compact places (activity, run history); map domain statuses in a tested pure function (`approvals.ts`, `checks/status.ts`), not inline in JSX. Broken is the only red and it is the safelight.
- **Film:** `.film` (edge lead letters, lit / unlit rows, `NEW` / `STILL OPEN` / `FIXED` tags), `.run-strip` / `.run-frame-*` (30 frames), `.slip` for SQL with line numbers, `.fog-message` for a broken run's error. Returned rows are lit; fixed rows are unlit and struck through. A long result is capped at 12 rows with "Show all N rows"; the full set stays in the report.
- **The run report** carries the statement and the diff: a plain-language change sentence plus new / still open / fixed counters, the film of returned rows, and the SQL slip under it. A broken run prints the error and the SQL beside it.
- **Empty, loading, error:** `EmptyState`, the skeletons in `PageSkeletons.tsx` (shimmer, not blink), `.face-note` for contained states, and `LoadingError` / `RunReportStates` with a retry. Every list and detail view has all three. Coverage's database failure is a contained section with a retry, not a page-wide error.
- **Code:** `CodeMirrorEditor` for editing (the read-only validator marks the refused word with `.cm-rejected`), `.slip` / `SqlSlip` for display, never a light grey code box on the face.
- Toasts through `sonner`; dialogs through `Dialog` / `AlertDialog` (destructive confirmations always `AlertDialog`).
- Icons from `lucide-react`: `size-4` in controls, `size-3.5` inline with caption text.

## Brand mark

The **Row A**: a solid A cut by a horizontal gap, the crossbar drawn as a row being checked. One source, `src/lib/brand/mark.ts`, draws it everywhere: `RowAMark` and `BrandMark` (mark plus wordmark) in the interface, the favicon `src/app/icon.svg`, and the iOS icon `src/app/apple-icon.tsx`. The landing's nav is the one exception: in the light table's world it draws a film with one lit row (`landing/sections/nav/BrandMark.tsx`), which lights with the hero's returned rows. After changing the Row A, regenerate the favicon with `npx tsx scripts/brand/render-icons.ts`.

- **Construction:** a 64-unit square; the A is one polygon (apex (32, 7), feet x = 7–20 and 44–57 on y = 57, counter apex (32, 33)) with a 2.5-unit same-colour stroke to soften the corners, cut by a 5-unit gap at y = 30.5. A moving gap stays between y = 22 and 40.
- **Colour:** none of its own. In the interface it takes the colour of the text around it. The favicon is `#070A1A` in a light browser and `#EEF0FF` in a dark one; the iOS icon is the light mark on a dark square tile. As an alert's sender it sits on a `primary` tile. Never recolour it with status colours.

## Landing

The landing page (`src/components/landing`) is where the product is sold rather than used, and it has its own world: **the light table**. A dark viewing room, a light box, and the database held up to the light as film. A check reads a table; the rows it returns are the only marks of light. Nothing outside this section applies to the landing unless it says so, and nothing here applies to the app.

- **Grounds.** Each section sets `data-ground`, which sets its background and the ground's ink, lines and CTA colours (`styles/base.css`): `room` (the dim room: hero, outcomes, the plates, final, footer), `box` (the lit opal face of the light box: how a run works, workflow), `lead` (sheet lead: read-only), `daylight` (house lights on: self-host, FAQ). A ground change is a change of light, never a cut: a `.seam` (the previous ground's light going out as the section scrolls in) or house lights (`lt-house`, `.houselights` and `.house-in`). The fixed nav takes the ground under its bar.
- **Palette.** The `lt-*` colours, defined once in `globals.css` (one `:root` block that only the landing reads; the front matter mirrors the opaque base colours, each paired with its ink in a `landing-*` component): `lt-room-*`, `lt-box-*`, `lt-film-*`, `lt-lead-*`, `lt-day-*`, `lt-fog-*` (a broken check: film that cannot be read), `lt-metal-*` (frames and clips), `lt-chat-*` (the alert, in assay's own ink), `lt-nav-*` (the bar on each ground), the translucent inks and lines of each ground (`-ink-2`, `-ink-3`, `-line`, `-line-2`), the one-light shadows (`--lt-shadow-*`), and each section's own materials (`lt-hero-*`, `lt-run-*`, `lt-safety-*`, `lt-outcomes-*`, `lt-plates-*`, `lt-selfhost-*`, `lt-final-*`). A colour a section needs is added there, never written in place; canvas and shader colours are the exception, read from these tokens where they can be.
- **Lumen means one thing.** `lt-lumen` (`#9FDCFF`) and its core, glow, halo, line and ink are light through a row a check returned. Never a link, a button, a focus ring, a highlight or decoration. Calls to action are the ground's ink (`.btn-ink`, `.btn-ghost`); focus rings use the ground's ink. Outcomes keep the app's meaning, drawn as film: clear film is Clean, lit rows are Issues, fog is Broken.
- **Type.** Sofia Sans for everything read (headlines 600, tight), Sofia Sans Condensed 800 capitals only for the lead letters printed on a film's edge, Maple Mono NL (regular) for SQL, rows, ids and code; all SIL OFL through `next/font` (`src/components/type/fonts.ts`, shared with the app). No Instrument Serif or Geist on the landing. Sizes are the landing's own scale in `landing/styles/tokens.css`: the levels `--lt-text-h1`, `-h2-xl`, `-h2`, `-h3`, `-lede`, `-body`, `-proof`, `-note`, `-tag` (with `-zh` and phone variants) and the fixed steps `--lt-text-13` to `-26`. A size off that scale (a giant count, an engraving) is a custom property defined once on its section's root (`--run-text-count`). CSS reads sizes with `var()`; it never writes a literal `font-size`. Proof text (SQL, rows, ids) is 14–16px on desktop; 13px is the floor for any text. Chinese sets leading 1.75 and its headlines are broken by hand in the copy table. A very wide desk (≥1600px) lifts the hero display so it keeps its weight as the box grows: `clamp(var(--lt-text-h1), 7.6vw, 152px)`, Chinese `clamp(var(--lt-text-h1-zh), 6.2vw, 124px)`, the lede widening to 34rem.
- **Frame.** A composition hangs off the edge the light leaves, not off a text column. The stage (`max(100%, 160svh)` wide, right-anchored) stops 6% short of the wall, so `--lt-edge: max(6vw, 9.6svh)` in `styles/tokens.css` is that margin; on desktop the hero copy, the final copy and the footer grid and base take it as padding and keep their own text measure inside it. Read the page as one picture: copy and box each the same distance from their wall, not a 1280px column floating in a wider room. The nav is the deliberate exception and stays a 1240px bar: it is furniture in the room, not a composition.
- **Shapes and depth.** Objects are physical: the radii `--lt-r-xs` to `--lt-r-md`, shadows from the one light (the box), baked 3D art in `public/landing/<section>/` (keep its formats and sizes; next/image where the art allows it).
- **Allowed here, not in the app:** dark grounds, light through returned rows with a tight halo, film grain, baked 3D art and live WebGL, shadows and lift, rounded objects. **Not here either:** glass (the fixed nav's frosted bar, `lt-nav-*`, is the one exception), decorative gradients or glows, light that is not a returned row, invented data, a theme switch.
- **Facts.** Everything shown exists in the product; rows, counts, errors and run times come from the demo seed and real demo runs (`scripts/demo/`). A composed run, or a schedule printed next to a demo check, is labelled Example / 示例.

### Landing structure

- `LandingPage.tsx` is the client shell: the `.lt` root, the fonts, the pre-paint flags (`lib/prepaint.tsx`: `lt-js`, `lt-intro`, `lt-push`, `lt-run-story`, `lt-zh-wait` on `<html>`), the section order. `page.tsx` passes `demo`; the nav's session link comes from `useCurrentUser()` and holds its width while the session loads; the language is the app's `LanguageProvider`.
- `lib/`: the context, the copy tables (`defineCopy`, `useCopy`), the motion hook and runtime, the GSAP loader, the film renderer (`film.ts`), the grain, and the page motion (nav ground, anchors, seam fallback). `styles/`: tokens, base (grounds, type, buttons, film, seams, house lights) and the grain.
- `sections/<name>/`: `<Name>.tsx`, `<name>.css`, `<name>.motion.ts`, `copy.tsx`, and whatever else the section needs. Ids: `top`, `run`, `safety`, `outcomes`, `workflow`, `plates`, `selfhost`, `faq`, `final`.
- Every CSS rule is scoped under `.lt` (Chinese: `.lt:lang(zh)`), so nothing leaks into the app. Class names that collide with Tailwind utilities (`fixed`, `hidden`, `block`, `grid`, …) are never used for landing state; use `is-*`. No hex values in TSX and no Tailwind size classes.

### Landing motion

- **The markup is the settled page.** React renders every string and element on the server, in English and Chinese from typed copy tables next to each section. Without JS, under reduced motion, and before motion loads, the page is complete: baked posters (never blank boxes), every row, every count.
- **Motion is a module.** Rich, choreographed and physical, but always an imperative module, `mount(root, ctx) => cleanup`, started by `useMotion` after hydration as its own chunk. GSAP comes from the npm package with its plugins on demand; three.js only on desktop, imported after the hero's switch-on, with WebGL rendered only while visible and the device pixel ratio capped. Neither is ever on the critical path.
- **Rules.** Animate transform and opacity only. Arm a set piece only while it is still below the fold, and only once. Loops run only while visible. Never animate one property of one element from both CSS and GSAP. Continuous, scroll-linked light (seams, house lights, the push-in) is a CSS scroll-driven animation; ScrollTrigger is for scrubbed or pinned stories CSS cannot do. Heavy set-up waits for the hero to settle (`afterIntro`) and is split across idle moments when it builds many nodes.
- **Layout changes.** A set piece that changes layout does it unseen: whatever moves is at opacity 0 while it moves, and nothing the reader is reading moves. The workflow's contact sheet opens only while the next section's heading is below the fold (otherwise frame 3 stays in the gate).
- **WebKit.** Never hand GSAP (or ScrollTrigger) a target that is not rendered: it measures a `display: none` element by attaching it to `<html>`, and on `/` that restyles the whole page (60–80ms a node on a phone). Skip hidden targets, as the run does below the desk layout; avoid `ScrollTrigger.refresh()` when nothing moved (it appends a probe to `<body>`).
- **Page-wide patches** (the parked ScrollTrigger loop in `lib/gsap.ts`) last only while the landing is mounted: `lifetime.onLeave` undoes them after a client-side navigation away.
- **Language switch.** Every module is torn down before React swaps the text and mounts again with `ctx.remount` (show settled states, never replay an entrance; `ctx.memo` remembers what played). A cleanup restores exactly what React rendered: no leftover nodes, inline styles, canvases or listeners. The reader keeps their place.
- **Reduced motion** shows every final state at once: no pinning, no WebGL, no loops, no pointer effects.
- **Budget**, measured on a production build in Chromium: median ≥ 55 fps during the hero switch-on, its idle cycle and a reading-pace scroll at 1440 and 390; no long task over 50ms after first paint while scrolling; CLS < 0.05; no horizontal overflow at 1440, 1280, 768 and 390; no console errors or hydration warnings.

## Docs

The docs (`src/components/docs`) are the same room and light box: a dark 56px header (mark in room ink, a lead "Assay Help" label, search, the language switch, an ink "Open Assay" button), then one lit face holding contents on the left and "On this page" on the right, each behind a hairline. Article titles are `display-lg` in ink, closed by a rule; notes are face-hi with an ink left edge; code blocks are film slips with the film print colours; tables are ruled in `line`; previous and next are two halves of one ruled panel.

## Do's and Don'ts

- Do use light only for meaning: lumen is a returned row, the safelight is Broken, and the status words always say what the marks mean.
- Do keep every string in English and Chinese, and check the Chinese layout: it runs longer and taller.
- Do check 375px and 1280px in both languages before calling a UI change done.
- Do respect `prefers-reduced-motion`; in the app, motion is 150–250ms ease-out and only for state changes (the landing has its own rules).
- Don't add decorative gradients or glows, glass, photography or illustrations to app pages. The one radial gradient is the face's light; the one shadow under film is physical.
- Don't use lumen for links, buttons, focus rings, nav or selection, and don't use the safelight for anything but Broken.
- Don't use pill-shaped uppercase eyebrows above headlines, rows of identical icon cards, or a centred hero over three cards.
- Don't use arbitrary font sizes (`text-[12.5px]`), arbitrary radii or hex colours in components.

## Type scale rules

- **Guard.** `src/lib/type-scale.test.ts` (part of `npm test`) fails on `text-[Npx]` or a Tailwind default size (`text-xs|sm|base|lg|xl|2xl…`, with or without a variant) in `src/**/*.{ts,tsx}`, and on a literal `px`/`rem` `font-size` in `src/**/*.css`. Test files are not scanned. CSS reads `var(--text-<level>)`.
- **`cn()`** registers the level names with tailwind-merge (`src/lib/utils/utils.ts`). Add a new level there too, or `cn("text-body-sm", "text-muted-foreground")` drops the size.
- **Weights.** Only headings, `.lead`, `label-caps` and `stat` carry a weight; body levels and `caption` inherit, so `font-medium` and a parent's weight apply.
- **Fields on phones.** `Input` and `Textarea` take their level from `sm:` up; below that a base rule in `globals.css` keeps `[data-slot=input|textarea]` at 16px (the guard's one allowed literal) because iOS Safari zooms into smaller focused fields. A raw `<input>` styled as a field opts in with `data-slot="input"`.
- **Before deleting a class**, search for names built in template strings: `CoverageGrid.tsx` builds `` `status-dot-${tone}` ``, so `status-dot-success | attention_needed | failure` only look unused.

A size that is not on the scale maps to a level:

| Size | Level |
|---|---|
| 10.5–11.5px | `label-caps` if uppercase, else `caption` |
| 12px, 12.5px in compact controls (h-6/h-7 buttons, chips, metadata rows) | `caption` |
| 12.5px elsewhere (code, error boxes, form text), 13px | `body-sm` |
| 13.5px, 14px | `body-md` |
| 15–16px | `body-lg` |
| 17–19px | `title-sm` |
| 20px | `title` |
| 24–26px | `headline` (or `stat` for numbers) |
| 28px, 30px; 34px, 36px; 38px; 46–52px | `display-sm`; `display-md`; `display-lg`; `display-xl` |

## Verification

- Lint this file: `npx @google/design.md lint DESIGN.md` (structure, references, contrast of every component pair).
- **Screenshots** (`tests/visual/`, Playwright) at 375px and 1280px, English and Chinese: landing, sign-in, two docs articles, unauthorized; and as a demo guest, the checks list, a check with issues, a broken and a clean check, manage checks, runs, a run report, coverage, analysis, activity and notification settings. Every page also fails on console errors.
- **Locally**, with `DEMO_MODE=true` and the demo data: `npm run build && npm run visual:baseline` before the change, `npm run build && npm run visual` after it. The browser clock is frozen at the baseline's time; output goes to the git-ignored `.visual/`. The landing is shot under reduced motion (its settled state); `tests/visual/stable.css` also freezes its CSS animations and transitions and hides the live light (seams, house lights, grain) so two screenshots of one build match.
- **In CI**, the Visual workflow seeds the demo data in MongoDB, PostgreSQL and Redis, runs every check twice, builds the base branch and the pull request and compares them. A pull request that changes the look on purpose gets the `visual-change` label and lists the expected differences; annotations name the changed pages. A pure refactor must produce no diff.
- **Landing**, beyond the screenshots: compare a change with the settled views at 1440, 1280, 768 and 390 in both languages, with JS off and under reduced motion, and measure the budget in [Landing motion](#landing-motion) on `npm run build && npx next start` (Playwright, Chromium and WebKit).
- Not covered: loading and empty states, dialogs, and pages a guest cannot open (new check, approvals, members, API keys).
