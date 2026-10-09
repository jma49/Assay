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

`src/app/globals.css` is the source of truth for values; this file mirrors it and says how to use them. Change a token in both, in the same commit. Brand history and the mascot live in `docs/brand.md`.

## Overview

Assay is a tool people open when something might be wrong with their data. The UI should feel calm, precise and current: the product of a small, careful startup, not an enterprise console. Most screens are tables, lists and detail panes read by engineers and analysts, in English and Chinese. There is one theme, light.

Three words decide most calls: **quiet** (the data is loud, the chrome is not), **roomy** (large page titles, generous rows and white space; a working day's checks still fit without scrolling past the fold on a laptop), **consistent** (a status looks identical everywhere, so people learn it once).

The September 2026 refresh gave the app Geist, an indigo accent, large page titles with a one-line intro and status colours that read the same everywhere. In October 2026 the app and the docs moved onto the landing page's paper: light only, warm neutrals, hairlines instead of cards and shadows, square corners and serif titles, so the product and the page that sells it read as one thing.

## Colors

- **Indigo (`primary`, #4F63E8):** the one interactive colour. Primary buttons, links, the active nav item, focus rings, the tile behind the mark where it stands in for an app icon. Never a status.
- **Indigo ink (`primary-ink`, #2B3AAE)** is the accent as text on `primary-soft` (the active nav item, selected rows): the plain indigo is 4.3:1 there, below AA.
- **Neutrals** are the paper: a warm off-white page (`background` = `paper`), white panels (`card` = `paper-raised`), `muted` a slightly darker paper for tracks, table heads and hover. `foreground` (`ink`) for text, `muted-foreground` for secondary text, `subtle-foreground` never for text, only for marks (the idle status dot, list markers), `border` (`rule`) for dividers and panel outlines, `border-strong` (`rule-strong`) for inputs and outlined buttons.
- **Status colours are semantic and fixed:** `failure` = the check itself broke (error), `attention` = it found rows (issues), `success` = it found none (clean). Each has a `-soft` tint for its background. They never decorate, and they are never swapped for the accent.
- **Paper (`paper`, #F8F7F3)** is every page: the landing page, sign-in, the app and the docs. `paper`, `paper-raised`, `rule`, `rule-strong`, `ink` and `ink-muted` are the source values; the app tokens (`background`, `card`, `border`, `foreground`, …) point at them in `globals.css`.
- **Light only.** There is no dark theme, no theme switch and no `.dark` class; a dark system setting renders the same page. Do not add `dark:` variants.
- Colours reach components only through Tailwind utilities mapped in `@theme inline` (`bg-card`, `text-muted-foreground`, `text-attention`, …). No hex values, no raw palette classes (`text-blue-600`), no `dark:` overrides for colour.

## Typography

Geist for everything readable, Geist Mono for SQL, ids, cron expressions, numbers that line up in columns and the small group labels, Instrument Serif (`font-editorial`, regular weight) for page titles: the app shell's title, a check's name, settings pages and docs articles, as on the landing page. The serif is loaded once in the root layout as `--font-serif`; Chinese falls back to a system Song face. Chinese falls back to a named Simplified Chinese face: PingFang SC (Apple), Microsoft YaHei (Windows), Noto Sans SC / Noto Sans CJK SC (Linux, Android). Name the face rather than leaving CJK to `system-ui`: the generic fallback picks a CJK font by the page language, which the language switch sets only after hydration, so Chinese text could render with Japanese glyph shapes.

The scale in the front matter is the whole set of sizes: every text size is one of its levels, used as a `text-<level>` utility (a test enforces it; see Migration). Roles:

- `display-*`: landing page and docs titles, and app page titles (`display-md` in `font-editorial`, set by the shell, and a check's name on its page); `display-2xl` is the landing hero and closing headline alone, `display-xl` the landing section titles.
- `headline`, `title`, `title-sm`: section headings, card titles, dialog titles.
- `body-md` (15px) is the page default and the sidebar; `body-sm` (14px) is the workhorse for tables, buttons and form controls; `body-lg` (16px) is for docs prose and landing copy.
- `caption` (13px): metadata, timestamps, badges, helper text.
- `label-caps` (11px, uppercase): the small section label above a group (sidebar groups, "On this page", form sections), set in Geist Mono in the sidebars. One style; do not invent variants.
- `stat`: the big numbers in stat tiles, with tabular figures.
- Weights: 400 body, 500 for emphasis inside UI and the `stat` numbers, 600 for headings, display and labels.
- Line heights of the body levels, `caption` and `label-caps` are whole even pixels (26, 22, 20, 18, 14px). Text of mixed levels centred in one row, like a table row or a toolbar, then shares a baseline; with fractional or odd line boxes, 12px and 14px text in the same row land up to 2px apart.

## Layout

- Spacing follows Tailwind's 4px scale. Prefer 2, 3, 4, 6 and 8 (8–32px); reach for odd steps only to align with a neighbour.
- App pages sit in `APP_CONTAINER` (`max-w-[1280px]`, centred) so edges line up under the top bar. The shell is a ruled column: a paper sidebar (248px) with a hairline on its right, the mark in a 48px row and each nav section under a hairline; the current page is a white cell outlined in `rule` with an indigo edge. The demo notice is a 48px white band across the content column, its bottom rule level with the one under the mark.
- A page is a shell over a data hook and section components (`AGENTS.md`). The app shell draws the page heading from `app-shell-routes.ts`, closed by a hairline: a serif `display-md` title, an optional count beside it (`WindowStatusBar`), a one-line intro, and the page's actions on the right (`WindowToolbar`). Pages about one thing (a check, a run) get a "‹ back to the list" link instead and draw their own heading. Then a stat strip or filters, then the main list. On the Checks page the stat tiles are the filter, and a chosen check opens beside the list (`?check=`, from 1280px; a drawer below) with the same tabs as its own page.
- Controls are 36px tall (`h-9`), 32px when compact, 44px for landing CTAs. Search fields in a page heading are 40px tall.
- Must work at 375px wide without horizontal page scroll; wide tables scroll inside their own container.

## Elevation & Depth

Nothing lifts. Panels sit flat on the paper inside a `rule` hairline (`shadow-border`, a 1px ring so it never shifts layout; `shadow-border-hover` darkens it to `rule-strong`), and cells inside a panel are divided by hairlines rather than spaced apart. `shadow-md` is the one shadow, for things that float over the page: popovers, menus, dropdowns, toasts. No drop shadows on panels or buttons, no glass, no blur.

## Shapes

Square. `--radius` is 0, so `rounded-sm|md|lg|xl` (still used by the primitives) all draw square corners: panels, dialogs, menus, inputs, buttons, badges, pills, tabs, switches and code. `rounded-full` is kept for status dots, small marker dots and avatars only. Panels that matter on a page may carry registration marks at their corners (`corners`). No arbitrary radii (`rounded-[5px]`).

## Components

- Use the shadcn primitives in `src/components/ui` (new-york style, Radix). Extend a primitive with a variant before writing a one-off; never fork its styles into a page.
- **Buttons**: ink (`bg-foreground text-background`) for the main action, a `rule-strong` outline on white for the secondary one, ghost for quiet ones. Indigo is for links, focus, the current page and progress, not for buttons.
- **Segmented filters** are a `bg-muted` track whose chosen option is filled with ink (`bg-foreground text-background`), optionally with a count; `Tabs` follows the same look on a white track.
- **Status** is shown with `.status-dot` + `status-dot-{error|issues|clean|idle}`, a soft square status tag (`OUTCOME_PILL`, a dot in the current colour plus the finding, as in the checks table), or the `Badge` variants `failure | attention | success`. Map domain statuses in a pure function with a test (see `approvals.ts`, `checks/status.ts`), not inline in JSX.
- **Empty, loading, error:** `EmptyState` (one quiet line, optional hint and action), the skeletons in `PageSkeletons.tsx` (shimmer, not blink), `LoadingError` / `RunReportStates` for failures with a retry. Every list and detail view has all three.
- **Code** uses `CodeMirrorEditor` for editing and `HighlightedLine` / `.tok-*` classes for display, on `bg-code`.
- Toasts through `sonner`; dialogs through `Dialog` / `AlertDialog` (destructive confirmations always use `AlertDialog`).
- Icons from `lucide-react`, 16px (`size-4`) in controls, 14px (`size-3.5`) inline with caption text.

## Landing

The landing page (`src/components/landing`) is the one place the product is sold rather than used. It reads like a technical document on ruled paper: structure comes from hairlines, not from cards, glows or shadows.

- **Type.** Headlines are set in Instrument Serif at regular weight (`font-editorial`, the site-wide serif from the root layout), with the accent in italic for the second line of the hero and closing titles; Chinese falls back to a system Song face. Running text is Figtree, code (SQL, ids, cron, the terminal) Maple Mono NL, and section labels small mono capitals (`eyebrow`). All are SIL OFL and self-hosted through `next/font`; `landing.css` swaps Figtree and Maple Mono in on `.landing`.
- **The ruled column.** Every section sits in `FRAME` (`ui.tsx`): a 1200px column with hairlines down both sides, a rule across the page above each section and a small cross where they meet (`ticks`). Inside a section, cells are divided by hairlines, never spaced apart as cards. A band of diagonal hatching (`hatch`) opens the closing section.
- **Graph paper.** Small diagrams, code and product panels sit on graph paper (`graph`: a 20px grid in `rule` with a faint indigo wash in one corner). Panels on it are `paper-raised` with a `rule-strong` border and no shadow; the main product panels (the hero workspace, the terminal, the triage and agent snippets, the sign-in alert) carry registration marks at their corners (`corners`). Everything is light: there are no dark panels.
- **Corners.** Square. Panels, cells, buttons, tags and code blocks have no radius; only status dots stay round.
- **Controls.** Ink for the primary action, a `rule-strong` outline on `paper-raised` for the secondary one. Indigo is for the scroll progress line under the nav, step progress, icons and the italic accent in titles; status colours keep their meaning.
- **Light only**, like the rest of the site; the landing nav has no theme switch.
- **Not here.** No glows, glass, film grain, photography, pointer lights, 3D tilts or shadows.
- **Motion.** GSAP with ScrollTrigger (`motion.ts`). Reduced motion turns off large movement (pinning, sliding, scaling) and keeps fades, typing, counters and the scan line. "What happens in one run" pins on desktop, becomes tabs with previous and next under reduced motion, and stacks on phones.
- **Facts.** Everything the page shows exists in the product, and its numbers come from the live demo or `scripts/demo/checks.ts`.

## Docs

The docs (`src/components/docs`) wrap their pages in the same ruled column as the landing page: a 1280px frame with hairlines down both sides, a 64px top bar on the paper (mark, a mono "Assay Help" label, search, the language switch and an ink "Open Assay" button), the contents on the left and "On this page" on the right, each behind a hairline. Article titles are serif `display-lg` closed by a rule; notes are white with an indigo left edge; code blocks and tables are square and ruled; previous and next are two cells of one ruled panel.

## Do's and Don'ts

- Do use colour only for meaning: indigo for action, the three status colours for check state.
- Do keep every user-facing string in both English and Chinese, and check the Chinese layout: it runs longer and taller.
- Do check 375px and 1280px, English and Chinese, before calling a UI change done.
- Do respect `prefers-reduced-motion`; motion is 150–200ms ease-out and only for state changes.
- Don't add gradients, glows, glass blur, drop shadows, rounded corners or decorative illustrations to app pages. The Row A mark (`docs/brand.md`) is the logo; photography appears on the landing page only.
- Don't use pill-shaped uppercase "eyebrow" labels above headlines, rows of identical icon cards, or centred hero-plus-three-cards layouts. `label-caps` is for grouping controls, not for decoration.
- Don't use arbitrary font sizes (`text-[12.5px]`), arbitrary radii or hex colours in components.
- Don't put text in `subtle-foreground`, not even a "—" for no value: it is 3.6–3.8:1 on light surfaces, below AA. The quietest text is `muted-foreground` (5.0–5.4:1).

## Contrast

Every text pair meets WCAG AA (4.5:1). Fixed on 2026-09-27: the light-theme status colours were darkened within their hues (`success` #1D8A57 → #19754A, `attention` #B87408 → #915B06, `failure` #C93636 → #BB3232; `destructive` and `chart-2…4` follow them), and all text moved from `subtle-foreground` to `muted-foreground`. `npx @google/design.md lint` checks every component pair above.

## Migration

The type-scale migration is done (September 2026, one pull request per step): tokens; primitives; the app, auth and docs shells; the pages by feature folder; the landing page, whose `--l-*` aliases gave way to the app tokens; and the clean-up of `.unified-card` and `.text-gradient`. Every text size in `src` is now a `text-<level>` utility, and CSS reads `var(--text-<level>)`.

- **Guard.** `src/lib/type-scale.test.ts` runs with `npm test` and fails on any `text-[Npx]` or Tailwind default size (`text-xs|sm|base|lg|xl|2xl…`, with or without a variant) in `src/**/*.{ts,tsx}`, and on a literal `px`/`rem` `font-size` in `src/**/*.css`. Its one allowed literal is the 16px phone size for fields (below). Test files are not scanned.
- **Levels in `cn()`.** `cn()` registers the level names with tailwind-merge (`src/lib/utils/utils.ts`). A new level goes there too, or `cn("text-body-sm", "text-muted-foreground")` drops the size.
- **Weights.** Only headings, `label-caps` and `stat` carry a weight; body levels and `caption` inherit theirs, so `font-medium` and a parent's weight still apply.
- **Fields on phones.** `Input` and `Textarea` take their level from `sm:` up. Below that a base rule in `globals.css` keeps `[data-slot=input|textarea]` at 16px, because iOS Safari zooms into a focused field set any smaller. A raw `<input>` styled like a field opts in with `data-slot="input"`.
- **Before deleting a class**, search for template-built names too: `status-dot-success | attention_needed | failure` look unused, but `CoverageGrid.tsx` builds them as `` `status-dot-${tone}` ``.

Choosing a level for a size that is not on the scale:

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

The uppercase section label has one style: `text-label-caps uppercase text-muted-foreground`.

## Verification

- Lint this file: `npx @google/design.md lint DESIGN.md` (structure, broken references, contrast of every component pair above).
- **Screenshots** (`tests/visual/`, Playwright) at 375px and 1280px, English and Chinese: landing, sign-in, two docs articles, unauthorized; and as a demo guest, the checks list, a check with issues, a broken check and a clean one, manage checks, runs, a run report, coverage, analysis, activity and notification settings. Every page also fails on console errors.
- **Locally**, against your own `.env.local` data with `DEMO_MODE=true`: `npm run build && npm run visual:baseline` before the change, then `npm run build && npm run visual` after it. The browser clock is frozen at the baseline's time so relative times match; output stays in the git-ignored `.visual/`.
- **In CI**, the Visual workflow starts MongoDB, PostgreSQL and Redis, seeds the demo data, runs every check twice, then builds the base branch and the pull request and compares them in one job. A pull request that changes the look on purpose gets the `visual-change` label and lists the expected differences; the job then passes, and annotations name the pages that changed.
- A pure refactor step (tokens, aliases) must produce no visual diff; a step that intentionally changes sizes lists the expected diffs in its pull request.
- `tests/visual/stable.css` freezes the landing page's CSS animations (the marquee and the terminal caret) and shows its scroll-driven reveals in their final state, so two screenshots of one build match.
- Not covered yet: loading and empty states, dialogs, and pages a guest cannot open (new check, approvals, members, API keys).
