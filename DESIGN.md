---
version: alpha
name: Assay
description: A calm operations UI for SQL data checks, set like a technical document on ruled paper. Light only, warm paper neutrals, hairlines instead of cards and shadows, square corners, serif titles, an indigo accent and three status colours that mean the same thing on every screen.
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
  auth-brand-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
  auth-brand-panel-muted:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
  landing-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  landing-paper-muted:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
  landing-paper-raised:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
  landing-rule:
    backgroundColor: "{colors.rule}"
  landing-rule-strong:
    backgroundColor: "{colors.rule-strong}"
  landing-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  stat-tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.stat}"
    rounded: "{rounded.none}"
---

# Assay

`src/app/globals.css` holds the values; this file mirrors them and says how to use them. Change a token in both, in the same commit.

## Overview

Assay is a tool people open when something might be wrong with their data. It should feel calm, precise and current, not like an enterprise console. Most screens are tables, lists and detail panes read by engineers and analysts, in English and Chinese. The app, the docs, sign-in and the landing page share one look: a technical document on ruled paper. Light only, warm neutrals, hairlines instead of cards and shadows, square corners, serif titles.

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

- **Faces.** Geist for everything readable. Geist Mono for SQL, ids, cron expressions, numbers that line up in columns and the sidebar group labels. Instrument Serif (`font-editorial`, regular weight, loaded once in the root layout as `--font-serif`) for page titles: the shell's title, a check's name, settings pages, docs articles and the landing page.
- **Chinese** falls back to named faces: a Song face for the serif; PingFang SC, Microsoft YaHei, then Noto Sans SC / Noto Sans CJK SC for the sans. Never leave CJK to `system-ui`: it picks a font by page language, which the language switch sets only after hydration, so Chinese could render with Japanese glyphs.
- **The scale** in the front matter is the whole set of sizes, used as `text-<level>` utilities (see [Type scale rules](#type-scale-rules)):
  - `display-md` in `font-editorial`: app page titles (set by the shell) and a check's name. `display-lg`: docs article titles. `display-xl`: landing section titles. `display-2xl`: the landing hero and closing headline only.
  - `headline`, `title`, `title-sm`: section, card and dialog titles.
  - `body-md` (15px): the page default and the sidebar. `body-sm` (14px): tables, buttons, form controls. `body-lg` (16px): docs prose and landing copy.
  - `caption` (13px): metadata, timestamps, badges, helper text.
  - `label-caps` (11px, uppercase): the one style of small group label (sidebar groups, "On this page", form sections): `text-label-caps uppercase text-muted-foreground`, in Geist Mono in the sidebars. It groups controls; it never decorates.
  - `stat`: big numbers in stat tiles, tabular figures.
- **Weights:** 400 body, 500 for emphasis and `stat`, 600 for headings, display and labels.
- Body, `caption` and `label-caps` line heights are whole even pixels (26, 22, 20, 18, 14px), so mixed levels centred in one row share a baseline.

## Layout

- Spacing follows Tailwind's 4px scale; prefer 2, 3, 4, 6 and 8, and odd steps only to align with a neighbour.
- App pages sit in `APP_CONTAINER` (`max-w-[1280px]`, centred). The shell is a ruled column: a 248px paper sidebar with a hairline on its right, the mark in a 48px row, each nav section under a hairline; the current page is a white cell outlined in `rule` with an indigo edge. The demo notice is a 48px white band whose bottom rule lines up with the one under the mark.
- A page is a shell over a data hook and section components. The shell draws the heading from `app-shell-routes.ts`, closed by a hairline: serif title, optional count (`WindowStatusBar`), a one-line intro, actions on the right (`WindowToolbar`). Pages about one thing (a check, a run) show a "‹ back to the list" link and draw their own heading. Then a stat strip or filters, then the list. On Checks the stat tiles are the filter, and a chosen check opens beside the list (`?check=`, from 1280px; a drawer below) with the same tabs as its own page.
- Controls are 36px (`h-9`), 32px compact, 44px for landing CTAs; search fields in a page heading are 40px.
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

The **Row A**: a solid A cut by a horizontal gap, the crossbar drawn as a row being checked. One source, `src/lib/brand/mark.ts`, draws it everywhere: `RowAMark` and `BrandMark` (mark plus wordmark) in the interface, the favicon `src/app/icon.svg`, and the iOS icon `src/app/apple-icon.tsx`. After changing it, regenerate the favicon with `npx tsx scripts/brand/render-icons.ts`.

- **Construction:** a 64-unit square; the A is one polygon (apex (32, 7), feet x = 7–20 and 44–57 on y = 57, counter apex (32, 33)) with a 2.5-unit same-colour stroke to soften the corners, cut by a 5-unit gap at y = 30.5. A moving gap (the landing page sweeps it) stays between y = 22 and 40.
- **Colour:** none of its own. In the interface it takes the colour of the text around it. The favicon is `#070A1A` in a light browser and `#EEF0FF` in a dark one; the iOS icon is the light mark on a dark square tile. As an alert's sender it sits on a `primary` tile. Never recolour it with status colours.

## Landing

The landing page (`src/components/landing`) is where the product is sold rather than used. Structure comes from hairlines, not cards, glows or shadows.

- **Type.** Headlines in Instrument Serif (`font-editorial`), with the second line of the hero and closing titles in italic indigo. Running text is Figtree, code (SQL, ids, cron, the terminal) Maple Mono NL, section labels small mono capitals (`eyebrow`). All SIL OFL, self-hosted through `next/font`; `landing.css` swaps Figtree and Maple Mono in on `.landing`.
- **The ruled column.** Every section sits in `FRAME` (`ui.tsx`): a 1200px column with hairlines down both sides, a rule above each section and a small cross where they meet (`ticks`). A band of diagonal hatching (`hatch`) opens the closing section.
- **Graph paper.** Diagrams, code and product panels sit on `graph` (a 20px grid in `rule` with a faint indigo wash in one corner). Panels on it are `paper-raised` with a `rule-strong` border; the main product panels carry `corners`. No dark panels.
- **Controls** as in the app. Indigo is for the scroll progress line, step progress, icons and the italic accent; status colours keep their meaning.
- **Not here:** glows, glass, film grain, photography, pointer lights, 3D tilts, shadows, a theme switch.
- **Motion.** GSAP with ScrollTrigger (`motion.ts`). Reduced motion turns off pinning, sliding and scaling and keeps fades, typing, counters and the scan line. "What happens in one run" pins on desktop, becomes tabs with previous and next under reduced motion, and stacks on phones.
- **Facts.** Everything shown exists in the product; numbers come from the live demo or `scripts/demo/checks.ts`.

## Docs

The docs (`src/components/docs`) use the same ruled column: a 1280px frame, a 64px top bar (mark, a mono "Assay Help" label, search, the language switch, an ink "Open Assay" button), contents on the left and "On this page" on the right, each behind a hairline. Article titles are serif `display-lg` closed by a rule; notes are white with an indigo left edge; code blocks and tables are square and ruled; previous and next are two cells of one ruled panel.

## Do's and Don'ts

- Do use colour only for meaning: indigo for action, the status colours for check state.
- Do keep every string in English and Chinese, and check the Chinese layout: it runs longer and taller.
- Do check 375px and 1280px in both languages before calling a UI change done.
- Do respect `prefers-reduced-motion`; motion is 150–200ms ease-out and only for state changes.
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
- **Locally**, with `DEMO_MODE=true` and the demo data: `npm run build && npm run visual:baseline` before the change, `npm run build && npm run visual` after it. The browser clock is frozen at the baseline's time; output goes to the git-ignored `.visual/`. `tests/visual/stable.css` freezes the landing animations so two screenshots of one build match.
- **In CI**, the Visual workflow seeds the demo data in MongoDB, PostgreSQL and Redis, runs every check twice, builds the base branch and the pull request and compares them. A pull request that changes the look on purpose gets the `visual-change` label and lists the expected differences; annotations name the changed pages. A pure refactor must produce no diff.
- Not covered: loading and empty states, dialogs, and pages a guest cannot open (new check, approvals, members, API keys).
