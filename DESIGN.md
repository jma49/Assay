---
version: alpha
name: Assay
description: A calm, modern operations UI for SQL data checks. Indigo accent, cool neutrals, generous type and pill-shaped controls, and three status colours that mean the same thing on every screen.
colors:
  primary: "#4F63E8"
  on-primary: "#FFFFFF"
  primary-soft: "#EEF0FE"
  primary-ink: "#2B3AAE"
  background: "#F6F7F9"
  foreground: "#15161C"
  card: "#FFFFFF"
  sidebar: "#FFFFFF"
  muted: "#F1F2F5"
  muted-foreground: "#5A5D6B"
  subtle-foreground: "#8A8E9C"
  border: "#E4E6EC"
  border-strong: "#D3D6DF"
  success: "#1F7A52"
  success-soft: "#E8F5EE"
  attention: "#8A5A12"
  attention-soft: "#FBF1DE"
  failure: "#B42A2A"
  failure-soft: "#FBEAEA"
  code-bg: "#F7F8FA"
  primary-dark: "#8C9BFF"
  on-primary-dark: "#0A0C16"
  primary-soft-dark: "#1D2150"
  primary-ink-dark: "#C3CAFF"
  background-dark: "#0A0C16"
  foreground-dark: "#ECEEF8"
  card-dark: "#11141F"
  sidebar-dark: "#0D1019"
  muted-dark: "#181B29"
  muted-foreground-dark: "#A9AEC6"
  subtle-foreground-dark: "#7C8199"
  border-dark: "#232739"
  border-strong-dark: "#30354B"
  success-dark: "#4FC48A"
  success-soft-dark: "#13291F"
  attention-dark: "#E4A94A"
  attention-soft-dark: "#33281A"
  failure-dark: "#F07474"
  failure-soft-dark: "#331B1F"
  code-bg-dark: "#0C0F1C"
  night: "#070A1A"
  night-foreground: "#EEF0FF"
  night-muted: "#A9AFD0"
typography:
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
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  unit: 4px
  control-height: 36px
  control-height-sm: 32px
  control-height-lg: 44px
  content-max: 1120px
  card-padding: 24px
  status-dot: 8px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-md}"
  page-dark:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.foreground-dark}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  card-dark:
    backgroundColor: "{colors.card-dark}"
    textColor: "{colors.foreground-dark}"
  secondary-text:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-sm}"
  secondary-text-dark:
    backgroundColor: "{colors.card-dark}"
    textColor: "{colors.muted-foreground-dark}"
  sidebar-label:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-caps}"
  sidebar-label-dark:
    backgroundColor: "{colors.sidebar-dark}"
    textColor: "{colors.muted-foreground-dark}"
  status-dot-idle:
    backgroundColor: "{colors.subtle-foreground}"
    size: "{spacing.status-dot}"
    rounded: "{rounded.full}"
  status-dot-idle-dark:
    backgroundColor: "{colors.subtle-foreground-dark}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    height: "{spacing.control-height}"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary-dark}"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    height: "{spacing.control-height}"
  button-secondary-dark:
    backgroundColor: "{colors.muted-dark}"
    textColor: "{colors.foreground-dark}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
  input-border:
    backgroundColor: "{colors.border-strong}"
  input-border-dark:
    backgroundColor: "{colors.border-strong-dark}"
  divider:
    backgroundColor: "{colors.border}"
  divider-dark:
    backgroundColor: "{colors.border-dark}"
  nav-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.md}"
  nav-item-active-dark:
    backgroundColor: "{colors.primary-soft-dark}"
    textColor: "{colors.primary-ink-dark}"
  badge-clean:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  badge-clean-dark:
    backgroundColor: "{colors.success-soft-dark}"
    textColor: "{colors.success-dark}"
  badge-issues:
    backgroundColor: "{colors.attention-soft}"
    textColor: "{colors.attention}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  badge-issues-dark:
    backgroundColor: "{colors.attention-soft-dark}"
    textColor: "{colors.attention-dark}"
  badge-error:
    backgroundColor: "{colors.failure-soft}"
    textColor: "{colors.failure}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  badge-error-dark:
    backgroundColor: "{colors.failure-soft-dark}"
    textColor: "{colors.failure-dark}"
  status-dot:
    size: "{spacing.status-dot}"
    rounded: "{rounded.full}"
  code-block:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.foreground}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
  demo-banner:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-muted}"
    typography: "{typography.body-sm}"
  demo-banner-title:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-foreground}"
  code-block-dark:
    backgroundColor: "{colors.code-bg-dark}"
    textColor: "{colors.foreground-dark}"
  stat-tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.stat}"
    rounded: "{rounded.xl}"
---

# Assay

`src/app/globals.css` is the source of truth for values; this file mirrors it and says how to use them. Change a token in both, in the same commit. Brand history and the mascot live in `docs/brand.md`.

## Overview

Assay is a tool people open when something might be wrong with their data. The UI should feel calm, precise and current: the product of a small, careful startup, not an enterprise console. Most screens are tables, lists and detail panes read by engineers and analysts, in English and Chinese, in light and dark themes.

Three words decide most calls: **quiet** (the data is loud, the chrome is not), **roomy** (large page titles, generous rows and white space; a working day's checks still fit without scrolling past the fold on a laptop), **consistent** (a status looks identical everywhere, so people learn it once).

The September 2026 refresh took its direction from an Open Design mock of the demo workspace: Geist, an indigo accent, 16px cards on a soft grey page, pill-shaped buttons and filters, large page titles with a one-line intro, and a dark demo notice band.

## Colors

- **Indigo (`primary`, #4F63E8):** the one interactive colour. Primary buttons, links, the active nav item, focus rings, the brand mark. Never a status.
- **Indigo ink (`primary-ink`, #2B3AAE)** is the accent as text on `primary-soft` (the active nav item, selected rows): the plain indigo is 4.3:1 there, below AA.
- **Neutrals** are cool greys that lean slightly toward the indigo. `foreground` for text, `muted-foreground` for secondary text, `subtle-foreground` never for text, only for marks (the idle status dot, list markers), `border` for dividers, `border-strong` for inputs.
- **Status colours are semantic and fixed:** `failure` = the check itself broke (error), `attention` = it found rows (issues), `success` = it found none (clean). Each has a `-soft` tint for its background. They never decorate, and they are never swapped for the accent.
- **Night (`night`, #070A1A)** is the dark band behind the demo notice and the landing video frame, in both themes, with `night-foreground` and `night-muted` for its text. It is not a surface for app content.
- Dark theme values carry a `-dark` suffix here; in code the same CSS variable switches under `.dark`, so components never branch on the theme.
- Colours reach components only through Tailwind utilities mapped in `@theme inline` (`bg-card`, `text-muted-foreground`, `text-attention`, …). No hex values, no raw palette classes (`text-blue-600`), no `dark:` overrides for colour.

## Typography

Geist for everything readable, Geist Mono for SQL, ids, cron expressions and numbers that line up in columns. Chinese falls back to a named Simplified Chinese face: PingFang SC (Apple), Microsoft YaHei (Windows), Noto Sans SC / Noto Sans CJK SC (Linux, Android). Name the face rather than leaving CJK to `system-ui`: the generic fallback picks a CJK font by the page language, which the language switch sets only after hydration, so Chinese text could render with Japanese glyph shapes.

The scale in the front matter is the whole set of sizes: every text size is one of its levels, used as a `text-<level>` utility (a test enforces it; see Migration). Roles:

- `display-*`: landing page and docs titles, and app page titles (`display-md`, set by the shell, and a check's name on its page); `display-xl` is the landing hero alone.
- `headline`, `title`, `title-sm`: section headings, card titles, dialog titles.
- `body-md` (15px) is the page default and the sidebar; `body-sm` (14px) is the workhorse for tables, buttons and form controls; `body-lg` (16px) is for docs prose and landing copy.
- `caption` (13px): metadata, timestamps, badges, helper text.
- `label-caps` (11px, uppercase): the small section label above a group (sidebar groups, "On this page", form sections). One style; do not invent variants.
- `stat`: the big numbers in stat tiles, with tabular figures.
- Weights: 400 body, 500 for emphasis inside UI and the `stat` numbers, 600 for headings, display and labels.
- Line heights of the body levels, `caption` and `label-caps` are whole even pixels (26, 22, 20, 18, 14px). Text of mixed levels centred in one row, like a table row or a toolbar, then shares a baseline; with fractional or odd line boxes, 12px and 14px text in the same row land up to 2px apart.

## Layout

- Spacing follows Tailwind's 4px scale. Prefer 2, 3, 4, 6 and 8 (8–32px); reach for odd steps only to align with a neighbour.
- App pages sit in `APP_CONTAINER` (`max-w-[1120px]`, centred) so edges line up under the top bar.
- A page is a shell over a data hook and section components (`AGENTS.md`). The app shell draws the page heading from `app-shell-routes.ts`: a `display-md` title, an optional count beside it (`WindowStatusBar`), a one-line intro, and the page's actions on the right (`WindowToolbar`). Pages about one thing (a check, a run) get a "‹ back to the list" link instead and draw their own heading. Then a stat strip or filters, then the main list.
- Controls are 36px tall (`h-9`), 32px when compact, 44px for landing CTAs. Search fields in a page heading are 40px pills.
- Must work at 375px wide without horizontal page scroll; wide tables scroll inside their own container.

## Elevation & Depth

Surfaces lift with a hairline ring and a long, soft drop (`shadow-border`, `shadow-border-hover` on hover) rather than a solid border, so a card reads the same on any background. Real borders are for dividers and inputs. `shadow-md` is for things that float (popovers, dropdowns, toasts) and the hover of a primary button. No other shadows, no glassmorphism; the only gradient is the landing hero's wash.

## Shapes

One radius scale derived from `--radius` (0.5rem): `rounded-sm` (6px) for checkboxes and tiny chips, `rounded-md` (8px) for inputs, selects and code chips, `rounded-lg` (12px) for code blocks, menus and nav items, `rounded-xl` (16px) for cards and dialogs, `rounded-full` for buttons, badges, status pills, segmented filters, dots and avatars. No arbitrary radii (`rounded-[5px]`).

## Components

- Use the shadcn primitives in `src/components/ui` (new-york style, Radix). Extend a primitive with a variant before writing a one-off; never fork its styles into a page.
- **Segmented filters** are a `bg-muted` pill track whose chosen option is a filled `bg-foreground text-background` pill, optionally with a count; `Tabs` follows the same look on a card track.
- **Status** is shown with `.status-dot` + `status-dot-{error|issues|clean|idle}`, a soft status pill (`OUTCOME_PILL`, a dot in the current colour plus the finding, as in the checks table), or the `Badge` variants `failure | attention | success`. Map domain statuses in a pure function with a test (see `approvals.ts`, `checks/status.ts`), not inline in JSX.
- **Empty, loading, error:** `EmptyState` (one quiet line, optional hint and action), the skeletons in `PageSkeletons.tsx` (shimmer, not blink), `LoadingError` / `RunReportStates` for failures with a retry. Every list and detail view has all three.
- **Code** uses `CodeMirrorEditor` for editing and `HighlightedLine` / `.tok-*` classes for display, on `bg-code`.
- Toasts through `sonner`; dialogs through `Dialog` / `AlertDialog` (destructive confirmations always use `AlertDialog`).
- Icons from `lucide-react`, 16px (`size-4`) in controls, 14px (`size-3.5`) inline with caption text.

## Do's and Don'ts

- Do use colour only for meaning: indigo for action, the three status colours for check state.
- Do keep every user-facing string in both English and Chinese, and check the Chinese layout: it runs longer and taller.
- Do check light and dark, 375px and 1280px, before calling a UI change done.
- Do respect `prefers-reduced-motion`; motion is 150–200ms ease-out and only for state changes.
- Don't add gradients, glows, glass blur, `shadow-lg`, or decorative illustrations to app pages. The beetle is the only illustration, and only on the landing page and brand marks; it stays the logo through the refresh.
- Don't use pill-shaped uppercase "eyebrow" labels above headlines, rows of identical icon cards, or centred hero-plus-three-cards layouts. `label-caps` is for grouping controls, not for decoration.
- Don't use arbitrary font sizes (`text-[12.5px]`), arbitrary radii or hex colours in components.
- Don't put text in `subtle-foreground`, not even a "—" for no value: it is 3.6–3.8:1 on light surfaces, below AA. The quietest text is `muted-foreground` (5.0–5.4:1).

## Contrast

Every text pair in the light theme meets WCAG AA (4.5:1); the dark theme always did. Fixed on 2026-09-27: the light-theme status colours were darkened within their hues (`success` #1D8A57 → #19754A, `attention` #B87408 → #915B06, `failure` #C93636 → #BB3232; `destructive` and `chart-2…4` follow them), and all text moved from `subtle-foreground` to `muted-foreground`. `npx @google/design.md lint` checks every component pair above.

## Migration

The type-scale migration is done (September 2026, one pull request per step): tokens; primitives; the app, auth and docs shells; the pages by feature folder; the landing page, whose `--l-*` aliases gave way to the app tokens; and the clean-up of `.unified-card` and `.text-gradient`. Every text size in `src` is now a `text-<level>` utility, and CSS reads `var(--text-<level>)`.

- **Guard.** `src/lib/type-scale.test.ts` runs with `npm test` and fails on any `text-[Npx]` or Tailwind default size (`text-xs|sm|base|lg|xl|2xl…`, with or without a variant) in `src/**/*.{ts,tsx}`, and on a literal `px`/`rem` `font-size` in `src/**/*.css`. Its one allowed literal is the 16px phone size for fields (below). Test files are not scanned.
- **Levels in `cn()`.** `cn()` registers the level names with tailwind-merge (`src/lib/utils/utils.ts`). A new level goes there too, or `cn("text-body-sm", "text-muted-foreground")` drops the size.
- **Weights.** Only headings, `label-caps` and `stat` carry a weight; body levels and `caption` inherit theirs, so `font-medium` and a parent's weight still apply.
- **Fields on phones.** `Input` and `Textarea` take their level from `sm:` up. Below that a base rule in `globals.css` keeps `[data-slot=input|textarea]` at 16px, because iOS Safari zooms into a focused field set any smaller. A raw `<input>` styled like a field opts in with `data-slot="input"`.
- **Before deleting a class**, search for template-built names too: `status-dot-success | attention_needed | failure` look unused, but `CoveragePanes.tsx` builds them as `` `status-dot-${tone}` ``.

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
- **Screenshots** (`tests/visual/`, Playwright) at 375px and 1280px, light and dark, English and Chinese: landing, sign-in, two docs articles, unauthorized; and as a demo guest, the checks list, a check with issues, a broken check and a clean one, manage checks, runs, a run report, coverage, analysis, activity and notification settings. Every page also fails on console errors.
- **Locally**, against your own `.env.local` data with `DEMO_MODE=true`: `npm run build && npm run visual:baseline` before the change, then `npm run build && npm run visual` after it. The browser clock is frozen at the baseline's time so relative times match; output stays in the git-ignored `.visual/`.
- **In CI**, the Visual workflow starts MongoDB, PostgreSQL and Redis, seeds the demo data, runs every check twice, then builds the base branch and the pull request and compares them in one job. A pull request that changes the look on purpose gets the `visual-change` label and lists the expected differences; the job then passes, and annotations name the pages that changed.
- A pure refactor step (tokens, aliases) must produce no visual diff; a step that intentionally changes sizes lists the expected diffs in its pull request.
- `tests/visual/stable.css` hides the landing video (it plays on its own clock) and the voxel beetle's contents: it follows the pointer even with reduced motion, and headless browsers without a GPU render it differently between machines.
- Not covered yet: loading and empty states, dialogs, and pages a guest cannot open (new check, approvals, members, API keys).
