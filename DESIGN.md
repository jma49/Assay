---
version: alpha
name: Assay
description: A calm, dense operations UI for SQL data checks. Cobalt accent, blue-leaning neutrals, and three status colours that mean the same thing on every screen.
colors:
  primary: "#2350C8"
  on-primary: "#FFFFFF"
  primary-soft: "#EAF0FD"
  background: "#F6F7F9"
  foreground: "#161B26"
  card: "#FFFFFF"
  sidebar: "#FBFBFC"
  muted: "#F1F3F6"
  muted-foreground: "#626B7C"
  subtle-foreground: "#7A8394"
  border: "#E3E6EB"
  border-strong: "#D2D7DF"
  success: "#19754A"
  success-soft: "#E8F6EE"
  attention: "#915B06"
  attention-soft: "#FDF4E3"
  failure: "#BB3232"
  failure-soft: "#FCEDED"
  code-bg: "#F4F5F8"
  primary-dark: "#6F95F2"
  on-primary-dark: "#0F1217"
  primary-soft-dark: "#1B2640"
  background-dark: "#0F1217"
  foreground-dark: "#E8EBF0"
  card-dark: "#161A21"
  sidebar-dark: "#12151B"
  muted-dark: "#1C212A"
  muted-foreground-dark: "#AAB2BF"
  subtle-foreground-dark: "#7E8898"
  border-dark: "#262C36"
  border-strong-dark: "#333B47"
  success-dark: "#4FC48A"
  success-soft-dark: "#15291F"
  attention-dark: "#E4A94A"
  attention-soft-dark: "#332815"
  failure-dark: "#F07474"
  failure-soft-dark: "#331B1D"
  code-bg-dark: "#12161C"
typography:
  display-xl:
    fontFamily: Manrope
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.025em
  display-lg:
    fontFamily: Manrope
    fontSize: 38px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.025em
  display-md:
    fontFamily: Manrope
    fontSize: 34px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.025em
  display-sm:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.02em
  title:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: 400
    lineHeight: 26px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  caption:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  label-caps:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.06em
  stat:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
    fontFeature: '"tnum" 1'
  code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: 4.4px
  md: 6.4px
  lg: 8.4px
  xl: 10.4px
  full: 9999px
spacing:
  unit: 4px
  control-height: 32px
  control-height-sm: 28px
  control-height-lg: 40px
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
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary-dark}"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
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
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  nav-item-active-dark:
    backgroundColor: "{colors.primary-soft-dark}"
    textColor: "{colors.primary-dark}"
  badge-clean:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
  badge-clean-dark:
    backgroundColor: "{colors.success-soft-dark}"
    textColor: "{colors.success-dark}"
  badge-issues:
    backgroundColor: "{colors.attention-soft}"
    textColor: "{colors.attention}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
  badge-issues-dark:
    backgroundColor: "{colors.attention-soft-dark}"
    textColor: "{colors.attention-dark}"
  badge-error:
    backgroundColor: "{colors.failure-soft}"
    textColor: "{colors.failure}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
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

Assay is a tool people open when something might be wrong with their data. The UI should feel calm, precise and dense: a well-kept instrument panel, not a marketing site. Most screens are tables, lists and detail panes read by engineers and analysts, in English and Chinese, in light and dark themes.

Three words decide most calls: **quiet** (the data is loud, the chrome is not), **dense** (fit a working day's checks on one screen without cramping), **consistent** (a status looks identical everywhere, so people learn it once).

## Colors

- **Cobalt (`primary`, #2350C8):** the one interactive colour. Primary buttons, links, the active nav item, focus rings, the brand mark. Never a status.
- **Neutrals** lean slightly blue toward the cobalt. `foreground` for text, `muted-foreground` for secondary text, `subtle-foreground` never for text, only for marks (the idle status dot, list markers), `border` for dividers, `border-strong` for inputs.
- **Status colours are semantic and fixed:** `failure` = the check itself broke (error), `attention` = it found rows (issues), `success` = it found none (clean). Each has a `-soft` tint for its background. They never decorate, and they are never swapped for the accent.
- Dark theme values carry a `-dark` suffix here; in code the same CSS variable switches under `.dark`, so components never branch on the theme.
- Colours reach components only through Tailwind utilities mapped in `@theme inline` (`bg-card`, `text-muted-foreground`, `text-attention`, …). No hex values, no raw palette classes (`text-blue-600`), no `dark:` overrides for colour.

## Typography

Manrope for everything readable, JetBrains Mono for SQL, ids, cron expressions and numbers that line up in columns. Chinese falls back to a named Simplified Chinese face: PingFang SC (Apple), Microsoft YaHei (Windows), Noto Sans SC / Noto Sans CJK SC (Linux, Android). Name the face rather than leaving CJK to `system-ui`: the generic fallback picks a CJK font by the page language, which the language switch sets only after hydration, so Chinese text could render with Japanese glyph shapes.

The scale in the front matter is the **target**: every text size maps to one of its levels, exposed as `text-<level>` utilities (see Migration). Roles:

- `display-*`: landing page and docs titles only; `display-xl` is the landing hero alone.
- `headline`, `title`, `title-sm`: page titles, section headings, dialog titles.
- `body-md` (14px) is the page default; `body-sm` (13px) is the workhorse for tables, buttons, form controls and the sidebar; `body-lg` (15px) is for docs prose and landing copy.
- `caption` (12px): metadata, timestamps, badges, helper text.
- `label-caps` (11px, uppercase): the small section label above a group (sidebar groups, "On this page", form sections). One style; do not invent variants.
- `stat`: the big numbers in stat tiles, with tabular figures.
- Weights: 400 body, 500 for emphasis inside UI, 600 for headings and labels, 700 for display only.
- Line heights of the body levels, `caption` and `label-caps` are whole even pixels (26, 20, 20, 16, 14px). Text of mixed levels centred in one row, like a table row or a toolbar, then shares a baseline; with fractional or odd line boxes, 12px and 14px text in the same row land up to 2px apart.

## Layout

- Spacing follows Tailwind's 4px scale. Prefer 2, 3, 4, 6 and 8 (8–32px); reach for odd steps only to align with a neighbour.
- App pages sit in `APP_CONTAINER` (`max-w-[1120px]`, centred) so edges line up under the top bar.
- A page is a shell over a data hook and section components (`AGENTS.md`). Page header, then a stat strip or filters, then the main list.
- Controls are 32px tall (`h-8`), 28px when compact, 40px for landing CTAs.
- Must work at 375px wide without horizontal page scroll; wide tables scroll inside their own container.

## Elevation & Depth

Surfaces lift with a transparent ring (`shadow-border`, `shadow-border-hover` on hover) rather than a solid border, so a card reads the same on any background. Real borders are for dividers and inputs. `shadow-md` is only for things that float: popovers, dropdowns, toasts. No other shadows, no glassmorphism, no gradients.

## Shapes

One radius scale derived from `--radius` (0.4rem): `rounded-sm` for checkboxes and tiny chips, `rounded-md` for buttons, inputs and badges, `rounded-lg` for code blocks and menus, `rounded-xl` for cards and dialogs, `rounded-full` for dots and avatars. No arbitrary radii (`rounded-[5px]`).

## Components

- Use the shadcn primitives in `src/components/ui` (new-york style, Radix). Extend a primitive with a variant before writing a one-off; never fork its styles into a page.
- **Status** is shown with `.status-dot` + `status-dot-{error|issues|clean|idle}`, or the `Badge` variants `failure | attention | success`. Map domain statuses in a pure function with a test (see `approvals.ts`, `checks/status.ts`), not inline in JSX.
- **Empty, loading, error:** `EmptyState` (one quiet line, optional hint and action), the skeletons in `PageSkeletons.tsx` (shimmer, not blink), `LoadingError` / `RunReportStates` for failures with a retry. Every list and detail view has all three.
- **Code** uses `CodeMirrorEditor` for editing and `HighlightedLine` / `.tok-*` classes for display, on `bg-code`.
- Toasts through `sonner`; dialogs through `Dialog` / `AlertDialog` (destructive confirmations always use `AlertDialog`).
- Icons from `lucide-react`, 16px (`size-4`) in controls, 14px (`size-3.5`) inline with caption text.

## Do's and Don'ts

- Do use colour only for meaning: cobalt for action, the three status colours for check state.
- Do keep every user-facing string in both English and Chinese, and check the Chinese layout: it runs longer and taller.
- Do check light and dark, 375px and 1280px, before calling a UI change done.
- Do respect `prefers-reduced-motion`; motion is 150–200ms ease-out and only for state changes.
- Don't add gradients, glows, glass blur, `shadow-lg`, or decorative illustrations to app pages. The beetle is the only illustration, and only on the landing page and brand marks.
- Don't use pill-shaped uppercase "eyebrow" labels above headlines, rows of identical icon cards, or centred hero-plus-three-cards layouts. `label-caps` is for grouping controls, not for decoration.
- Don't use arbitrary font sizes (`text-[12.5px]`), arbitrary radii or hex colours in components.
- Don't put text in `subtle-foreground`, not even a "—" for no value: it is 3.6–3.8:1 on light surfaces, below AA. The quietest text is `muted-foreground` (5.0–5.4:1).

## Contrast

Every text pair in the light theme meets WCAG AA (4.5:1); the dark theme always did. Fixed on 2026-09-27: the light-theme status colours were darkened within their hues (`success` #1D8A57 → #19754A, `attention` #B87408 → #915B06, `failure` #C93636 → #BB3232; `destructive` and `chart-2…4` follow them), and all text moved from `subtle-foreground` to `muted-foreground`. `npx @google/design.md lint` checks every component pair above.

## Migration

Refactor in this order, one step per pull request, each with a before/after screenshot comparison (see Verification):

1. **Tokens.** Done: the scale is in `@theme` in `globals.css` as `--text-<level>` with `--line-height`, `--letter-spacing` and `--font-weight` sub-properties, so `text-body-sm` etc. exist. Only headings, `label-caps` and `stat` carry a weight; body levels and `caption` inherit theirs, so `font-medium` and a parent's weight still apply. `cn()` registers the level names with tailwind-merge (`src/lib/utils/utils.ts`); a new level must be added there too, or `cn("text-body-sm", "text-muted-foreground")` drops the size.
2. **Primitives.** `src/components/ui/*` onto the scale (`Button` default → `text-body-sm`, `size="sm"` → `text-caption`).
3. **Shell.** `AppShell`, `Sidebar`, `PageHeader`, `AuthShell`, `DocsShell`.
4. **Pages**, one feature folder at a time, busiest first: `checks/`, `notifications/`, `settings/`, `business/scripts/`, then the rest.
5. **Landing.** Replace the `--l-*` aliases in `landing.css` with the app tokens directly (`text-muted-foreground`, `border-border`); they are one-to-one and add a second vocabulary.
6. **Clean-up.** Delete `.unified-card` and `.text-gradient` (no users). Before deleting any other class, search for template-built names too: `status-dot-success | attention_needed | failure` look unused but `CoveragePanes.tsx` builds them as `` `status-dot-${tone}` ``.

Size mapping for step 2–5 (arbitrary → level):

| Now | Level |
|---|---|
| `text-[11px]`, `text-[11.5px]` | `label-caps` if uppercase, else `caption` |
| `text-xs`, `text-[12px]`, `text-[12.5px]` in compact controls | `caption` |
| `text-[12.5px]` elsewhere, `text-[13px]` | `body-sm` |
| `text-[13.5px]`, `text-sm`, `text-[14px]` | `body-md` |
| `text-[15px]`, `text-base` | `body-lg` |
| `text-[17px]`, `text-lg`, `text-[19px]` | `title-sm` |
| `text-xl`, `text-[20px]` | `title` |
| `text-2xl`, `text-[24px]` | `headline` (or `stat` for numbers) |
| `text-[28px]`, `text-[34px]`, `text-[38px]` | `display-sm`, `display-md`, `display-lg` |

The seven existing variants of the uppercase section label (11/12px, medium/semibold/bold, `tracking-wide|wider|widest`, muted/subtle) all become `text-label-caps uppercase text-muted-foreground`.

## Verification

- Lint this file: `npx @google/design.md lint DESIGN.md` (structure, broken references, contrast of every component pair above).
- **Screenshots** (`tests/visual/`, Playwright) at 375px and 1280px, light and dark, English and Chinese: landing, sign-in, two docs articles, unauthorized; and as a demo guest, the checks list, a check with issues, a broken check and a clean one, manage checks, runs, a run report, coverage, analysis, activity and notification settings. Every page also fails on console errors.
- **Locally**, against your own `.env.local` data with `DEMO_MODE=true`: `npm run build && npm run visual:baseline` before the change, then `npm run build && npm run visual` after it. The browser clock is frozen at the baseline's time so relative times match; output stays in the git-ignored `.visual/`.
- **In CI**, the Visual workflow starts MongoDB, PostgreSQL and Redis, seeds the demo data, runs every check twice, then builds the base branch and the pull request and compares them in one job. A pull request that changes the look on purpose gets the `visual-change` label and lists the expected differences; the job then passes, and annotations name the pages that changed.
- A pure refactor step (tokens, aliases) must produce no visual diff; a step that intentionally changes sizes lists the expected diffs in its pull request.
- `tests/visual/stable.css` hides the voxel beetle's contents: it follows the pointer even with reduced motion, and headless browsers without a GPU render it differently between machines.
- Not covered yet: loading and empty states, dialogs, and pages a guest cannot open (new check, approvals, members, API keys).
