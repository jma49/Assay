# Agent Guidelines

## Workflow

- Never commit directly to `main`. Branch from `main` (e.g. `fix/...`, `feat/...`, `chore/...`) and open the PR against `main`.
- `main` is production: every merge deploys to Vercel, and there is no staging. Every commit on a PR must build and pass on its own; merge only when CI (`verify`) is green.
- Keep commits small and focused: one logical change per commit.
- Before every commit, make sure these pass:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npx knip` and `npm run build` before opening the PR (CI runs both)
- Add or update tests alongside behavior changes, especially for security-sensitive code (SQL validation, auth, RBAC).
- Tests never touch real services: mock MongoDB, PostgreSQL, Redis, AI and chat APIs. The local `.env.local` may point at a shared database.

## Code Layout

- Keep files small: a page is a shell over a data hook and section components; pure logic lives in a `.ts` module with tests. See `docs/architecture.md`.
- Routes are thin adapters over `src/server/services`; persistence lives in `src/server/repos`; `src/domain` is pure and imports nothing from `app/` or `server/`.

## Red Lines

Read `docs/engineering.md` (red lines, public contracts, hotspots, verification) before changing server code. The short version:

- Checks are read-only: never weaken the SQL validator, the read-only transaction or the statement timeout.
- Every check run goes through `runCheck`; respect its lease and fencing token.
- Data-source and channel secrets stay sealed with `ASSAY_SECRET_KEY`: never returned by an API, never logged.
- SSRF guards and PostgreSQL TLS verification stay on.
- New accounts are viewers; non-admin check changes go through approval when review is on.
- `GET /api/health`, the scheduler heartbeat, MCP tool names and `.env.example` variable names are public contracts.

## Repository Hygiene

The repository is public: anything committed stays readable in history even after a later commit deletes it.

- Never commit secrets or env files. `.env.example` holds placeholders only; real values live in `.env.local` and Vercel. Test fixtures use obviously fake credentials (`user:pass`).
- Never commit runtime data or generated output: database and Redis dumps, logs, `evals/results/`, `.visual/`, Playwright reports, `.next/`, `*.tsbuildinfo`, `node_modules/`.
- Personal tool files stay local: `.claude/settings.local.json`, `.claude/worktrees/`, `CLAUDE.local.md`, `.cursor/`, `.vscode/`, `.DS_Store`.
- When a new tool or script writes files into the repo, add its output to `.gitignore` in the same change.
- Stage paths explicitly and read `git status` and `git diff --cached` before committing; do not `git add -A` blindly.
- Delete files that are no longer used (boilerplate assets, placeholder directories) in the change that makes them unused.
- If something sensitive was committed, a follow-up delete is not enough: stop and tell the maintainer, since it needs credential rotation and a history rewrite.
- Delete a branch once its PR is merged, and remove agent worktrees (`git worktree remove`) when the work is done.

## UI Changes

- Read `DESIGN.md` before touching `src/components`, `src/app` or `globals.css`. It holds the tokens, the type scale, the component rules and the migration order for the current refactor.
- Style only through tokens: colour utilities from `@theme inline` (`bg-card`, `text-muted-foreground`, `text-attention`, …), the `text-<level>` type scale, the `rounded-sm|md|lg|xl|full` radii. No hex values, raw palette classes (`text-blue-600`), arbitrary sizes (`text-[12.5px]`, `rounded-[5px]`) or `dark:` colour overrides in components.
- Text sizes are `text-<level>` utilities only; `src/lib/type-scale.test.ts` fails on `text-[Npx]`, Tailwind's default sizes and literal CSS font sizes. The table in `DESIGN.md` (Migration) picks a level for a size that is not on the scale.
- Every list and detail view covers loading, empty and error states, and every user-facing string exists in English and Chinese.
- A token change edits `globals.css` and `DESIGN.md` in the same commit; run `npx @google/design.md lint DESIGN.md`.
- Before deleting a CSS class, search for names built in template strings as well as literal ones.
- Look at the result before calling a UI change done: `npm run build && npm run visual:baseline` before the change and `npm run build && npm run visual` after it (see Verification in `DESIGN.md`; it needs `DEMO_MODE=true` and the demo data). CI runs the same comparison on every pull request; label one that changes the look on purpose `visual-change` and list the intended differences.

## Commit Messages

- Write commit messages in English.
- Use Conventional Commits: `type(scope): summary`, e.g. `fix(sql): ...`, `chore(deps): ...`.
- Explain *why* in the body when the change is not obvious.

## Code Comments

- Do not write comments in Chinese.
- Prefer self-explanatory code: clear names and small functions over comments.
- Add brief English comments only where necessary, e.g. a non-obvious reason, a security constraint, or a workaround.
- User-facing UI strings are not comments and may stay in the language the app uses.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
