---
version: alpha
name: Assay
description: A calm operations UI for SQL data checks, set like a technical document on ruled paper. Light only, warm paper neutrals, hairlines instead of cards and shadows, square corners, serif titles, an indigo accent and three status colours that mean the same thing on every screen. The landing page has its own world, the light table (the lt-* tokens).
colors:
  primary: "#4F63E8"
  on-primary: "#FFFFFF"
  primary-soft: "#EEF0FE"
  primary-ink: "#2B3AAE"
  background: "#F8F7F3"
  foreground: "#16171B"
  card: "#FFFFFF"
  sidebar: "#F8F7F3"
  muted: "#F0EEE7"
  muted-foreground: "#64656B"
  subtle-foreground: "#9A988F"
  border: "#E3E1D8"
  border-strong: "#CBC8BC"
  success: "#1F7A52"
  success-soft: "#E8F5EE"
  attention: "#8A5A12"
  attention-soft: "#FBF1DE"
  failure: "#B42A2A"
  failure-soft: "#FBEAEA"
  code-bg: "#F4F3EE"
  paper: "#F8F7F3"
  paper-raised: "#FFFFFF"
  rule: "#E3E1D8"
  rule-strong: "#CBC8BC"
  ink: "#16171B"
  ink-muted: "#64656B"
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
  editorial:
    fontFamily: Instrument Serif
    fontSize: 34px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -0.01em
  display-2xl:
    fontFamily: Geist
    fontSize: 88px
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: -0.045em
  display-xl:
    fontFamily: Geist
    fontSize: 60px
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: -0.035em
  display-lg:
    fontFamily: Geist
    fontSize: 38px
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: -0.03em
  display-md:
    fontFamily: Geist
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.03em
  display-sm:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.02em
  title:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 26px
  body-md:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  caption:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.06em
  stat:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.03em
    fontFeature: '"tnum" 1'
  code:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.65
rounded:
  none: 0px
  full: 9999px
spacing:
  unit: 4px
  control-height: 36px
  control-height-sm: 32px
  control-height-lg: 44px
  content-max: 1280px
  card-padding: 24px
  sidebar-width: 248px
  shell-bar-height: 48px
  status-dot: 8px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-md}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "{spacing.card-padding}"
  secondary-text:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-sm}"
  sidebar-label:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-caps}"
  status-dot-idle:
    backgroundColor: "{colors.subtle-foreground}"
    size: "{spacing.status-dot}"
    rounded: "{rounded.full}"
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.card}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    height: "{spacing.control-height}"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    height: "{spacing.control-height}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    height: "{spacing.control-height}"
  input-border:
    backgroundColor: "{colors.border-strong}"
  divider:
    backgroundColor: "{colors.border}"
  nav-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.none}"
  badge-clean:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
  badge-issues:
    backgroundColor: "{colors.attention-soft}"
    textColor: "{colors.attention}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
  badge-error:
    backgroundColor: "{colors.failure-soft}"
    textColor: "{colors.failure}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
  status-dot:
    size: "{spacing.status-dot}"
    rounded: "{rounded.full}"
  code-block:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.foreground}"
    typography: "{typography.code}"
    rounded: "{rounded.none}"
  demo-banner:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-sm}"
  demo-banner-title:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
  popover:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
  panel-ring:
    backgroundColor: "{colors.rule}"
  panel-ring-hover:
    backgroundColor: "{colors.rule-strong}"
  auth-brand-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
  auth-brand-panel-muted:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
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
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.stat}"
    rounded: "{rounded.none}"
---

# Assay

`src/app/globals.css` holds the values; this file mirrors them and says how to use them. Change a token in both, in the same commit.

## Overview

Assay is a tool people open when something might be wrong with their data. It should feel calm, precise and current, not like an enterprise console. Most screens are tables, lists and detail panes read by engineers and analysts, in English and Chinese. The app, the docs and sign-in share one look: a technical document on ruled paper. Light only, warm neutrals, hairlines instead of cards and shadows, square corners, serif titles. The landing page now has its own world, the light table (see [Landing](#landing)); the app, the docs and sign-in will follow in a later redesign. Until then, everything outside the Landing section describes them, not the landing.

Three words decide most calls: **quiet** (the data is loud, the chrome is not), **roomy** (large page titles, generous rows, yet a working day's checks fit above the fold on a laptop), **consistent** (a status looks identical everywhere).

## Colors

- **Indigo (`primary`)** is the one interactive colour: links, the current page, focus rings, progress, the tile behind the mark where it stands in for an app icon. Never a status. **`primary-ink`** is the accent as text on `primary-soft` (plain indigo is only 4.3:1 there).
- **Neutrals are the paper.** `paper`, `paper-raised`, `rule`, `rule-strong`, `ink` and `ink-muted` are the source values; the app tokens point at them: `background` (page), `card` (white panels), `border` (dividers, panel outlines), `border-strong` (inputs, outlined buttons), `foreground` (text). `muted` is a darker paper for tracks, table heads and hover; `muted-foreground` is secondary text.
- **`subtle-foreground` is never text**, not even a "—": it is 3.6–3.8:1, below AA. Use it for marks only (the idle status dot, list markers). The quietest text is `muted-foreground`.
- **Status colours are semantic and fixed:** `failure` = the check broke (error), `attention` = it found rows (issues), `success` = it found none (clean). Each has a `-soft` background tint. They never decorate and are never swapped for the accent.
- **Light only.** No dark theme, theme switch, `.dark` class or `dark:` variant; a dark system setting renders the same page.
- Colours reach components only through the utilities in `@theme inline` (`bg-card`, `text-muted-foreground`, `text-attention`, …). No hex values or raw palette classes (`text-blue-600`).
- Every text pair meets WCAG AA (4.5:1); the lint below checks every component pair in the front matter.

## Typography

- **Faces.** Geist for everything readable. Geist Mono for SQL, ids, cron expressions, numbers that line up in columns and the sidebar group labels. Instrument Serif (`font-editorial`, regular weight, loaded once in the root layout as `--font-serif`) for page titles: the shell's title, a check's name, settings pages and docs articles.
- **Chinese** falls back to named faces: a Song face for the serif; PingFang SC, Microsoft YaHei, then Noto Sans SC / Noto Sans CJK SC for the sans. Never leave CJK to `system-ui`: it picks a font by page language, which the language switch sets only after hydration, so Chinese could render with Japanese glyphs.
- **The scale** in the front matter is the whole set of sizes, used as `text-<level>` utilities (see [Type scale rules](#type-scale-rules)):
  - `display-md` in `font-editorial`: app page titles (set by the shell) and a check's name. `display-lg`: docs article titles. `display-xl` and `display-2xl` are unused since the landing moved to its own scale; they stay for the coming redesign.
  - `headline`, `title`, `title-sm`: section, card and dialog titles.
  - `body-md` (15px): the page default and the sidebar. `body-sm` (14px): tables, buttons, form controls. `body-lg` (16px): docs prose.
  - `caption` (13px): metadata, timestamps, badges, helper text.
  - `label-caps` (11px, uppercase): the one style of small group label (sidebar groups, "On this page", form sections): `text-label-caps uppercase text-muted-foreground`, in Geist Mono in the sidebars. It groups controls; it never decorates.
  - `stat`: big numbers in stat tiles, tabular figures.
- **Weights:** 400 body, 500 for emphasis and `stat`, 600 for headings, display and labels.
- Body, `caption` and `label-caps` line heights are whole even pixels (26, 22, 20, 18, 14px), so mixed levels centred in one row share a baseline.

## Layout

- Spacing follows Tailwind's 4px scale; prefer 2, 3, 4, 6 and 8, and odd steps only to align with a neighbour.
- App pages sit in `APP_CONTAINER` (`max-w-[1280px]`, centred). The shell is a ruled column: a 248px paper sidebar with a hairline on its right, the mark in a 48px row, each nav section under a hairline; the current page is a white cell outlined in `rule` with an indigo edge. The demo notice is a 48px white band whose bottom rule lines up with the one under the mark.
- A page is a shell over a data hook and section components. The shell draws the heading from `app-shell-routes.ts`, closed by a hairline: serif title, optional count (`WindowStatusBar`), a one-line intro, actions on the right (`WindowToolbar`). Pages about one thing (a check, a run) show a "‹ back to the list" link and draw their own heading. Then a stat strip or filters, then the list. On Checks the stat tiles are the filter, and a chosen check opens beside the list (`?check=`, from 1280px; a drawer below) with the same tabs as its own page.
- Controls are 36px (`h-9`), 32px compact, 44px for large calls to action; search fields in a page heading are 40px.
- Must work at 375px without horizontal page scroll; wide tables scroll inside their own container.

## Elevation & Depth

Nothing lifts. Panels sit flat inside a `rule` hairline (`shadow-border`, a 1px ring that never shifts layout; `shadow-border-hover` darkens it to `rule-strong`), and cells inside a panel are divided by hairlines, not spaced apart. `shadow-md` is the one shadow, for things that float: popovers, menus, dropdowns, toasts. No glass, no blur.

## Shapes

Square. `--radius` is 0, so `rounded-sm|md|lg|xl` (still used by the primitives) draw square corners everywhere. `rounded-full` is for status dots, small marker dots and avatars only. Important panels may carry registration marks at their corners (`corners`). No arbitrary radii.

## Components

- Use the shadcn primitives in `src/components/ui` (new-york, Radix). Add a variant before writing a one-off; never fork a primitive's styles into a page.
- **Buttons:** ink (`bg-foreground text-background`) for the main action, a `rule-strong` outline on white for the secondary one, ghost for quiet ones. Indigo is not for buttons.
- **Segmented filters:** a `bg-muted` track whose chosen option is filled with ink, optionally with a count; `Tabs` look the same on a white track.
- **Status:** `.status-dot` + `status-dot-{error|issues|clean|idle}`, the square status tag `OUTCOME_PILL`, or the `Badge` variants `failure | attention | success`. Map domain statuses in a tested pure function (`approvals.ts`, `checks/status.ts`), not inline in JSX.
- **Empty, loading, error:** `EmptyState`, the skeletons in `PageSkeletons.tsx` (shimmer, not blink), and `LoadingError` / `RunReportStates` with a retry. Every list and detail view has all three.
- **Code:** `CodeMirrorEditor` for editing, `HighlightedLine` / `.tok-*` for display, on `bg-code`.
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
- **Type.** Sofia Sans for everything read (headlines 600, tight), Sofia Sans Condensed 800 capitals only for the lead letters printed on a film's edge, Maple Mono NL (regular) for SQL, rows, ids and code; all SIL OFL through `next/font` (`landing/fonts.ts`). No Instrument Serif or Geist on the landing. Sizes are the landing's own scale in `landing/styles/tokens.css`: the levels `--lt-text-h1`, `-h2-xl`, `-h2`, `-h3`, `-lede`, `-body`, `-proof`, `-note`, `-tag` (with `-zh` and phone variants) and the fixed steps `--lt-text-13` to `-26`. A size off that scale (a giant count, an engraving) is a custom property defined once on its section's root (`--run-text-count`). CSS reads sizes with `var()`; it never writes a literal `font-size`. Proof text (SQL, rows, ids) is 14–16px on desktop; 13px is the floor for any text. Chinese sets leading 1.75 and its headlines are broken by hand in the copy table.
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

The docs (`src/components/docs`) use the same ruled column: a 1280px frame, a 64px top bar (mark, a mono "Assay Help" label, search, the language switch, an ink "Open Assay" button), contents on the left and "On this page" on the right, each behind a hairline. Article titles are serif `display-lg` closed by a rule; notes are white with an indigo left edge; code blocks and tables are square and ruled; previous and next are two cells of one ruled panel.

## Do's and Don'ts

- Do use colour only for meaning: indigo for action, the status colours for check state.
- Do keep every string in English and Chinese, and check the Chinese layout: it runs longer and taller.
- Do check 375px and 1280px in both languages before calling a UI change done.
- Do respect `prefers-reduced-motion`; in the app, motion is 150–200ms ease-out and only for state changes (the landing has its own rules).
- Don't add gradients, glows, glass, drop shadows, rounded corners, photography or decorative illustrations to app pages.
- Don't use pill-shaped uppercase eyebrows above headlines, rows of identical icon cards, or a centred hero over three cards.
- Don't use arbitrary font sizes (`text-[12.5px]`), arbitrary radii or hex colours in components.

## Type scale rules

- **Guard.** `src/lib/type-scale.test.ts` (part of `npm test`) fails on `text-[Npx]` or a Tailwind default size (`text-xs|sm|base|lg|xl|2xl…`, with or without a variant) in `src/**/*.{ts,tsx}`, and on a literal `px`/`rem` `font-size` in `src/**/*.css`. Test files are not scanned. CSS reads `var(--text-<level>)`.
- **`cn()`** registers the level names with tailwind-merge (`src/lib/utils/utils.ts`). Add a new level there too, or `cn("text-body-sm", "text-muted-foreground")` drops the size.
- **Weights.** Only headings, `label-caps` and `stat` carry a weight; body levels and `caption` inherit, so `font-medium` and a parent's weight apply.
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
