# Agent Guidelines

## Workflow

- Never commit directly to `main` or `develop`. Branch from `develop` (e.g. `fix/...`, `feat/...`, `chore/...`) and open the PR against `develop`.
- `main` is production: every push deploys to Vercel. Promote `develop` to `main` with a PR once a batch of work is verified.
- Keep commits small and focused: one logical change per commit.
- Before every commit, make sure these pass:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
- Add or update tests alongside behavior changes, especially for security-sensitive code (SQL validation, auth, RBAC).
- Tests never touch real services: mock MongoDB, PostgreSQL, Redis, AI and chat APIs. The local `.env.local` may point at a shared database.

## Code Layout

- Keep files small: a page is a shell over a data hook and section components; pure logic lives in a `.ts` module with tests. See `docs/architecture.md`.

## UI Changes

- Read `DESIGN.md` before touching `src/components`, `src/app` or `globals.css`. It holds the tokens, the type scale, the component rules and the migration order for the current refactor.
- Style only through tokens: colour utilities from `@theme inline` (`bg-card`, `text-muted-foreground`, `text-attention`, …), the `text-<level>` type scale, the `rounded-sm|md|lg|xl|full` radii. No hex values, raw palette classes (`text-blue-600`), arbitrary sizes (`text-[12.5px]`, `rounded-[5px]`) or `dark:` colour overrides in components.
- When you touch a file that still uses arbitrary sizes, migrate that file using the mapping in `DESIGN.md`; do not mix old and new sizes within one component.
- Every list and detail view covers loading, empty and error states, and every user-facing string exists in English and Chinese.
- A token change edits `globals.css` and `DESIGN.md` in the same commit; run `npx @google/design.md lint DESIGN.md`.
- Before deleting a CSS class, search for names built in template strings as well as literal ones.
- Look at the result before calling a UI change done: screenshot each affected route before and after at 375px and 1280px, light and dark (for example `npx playwright screenshot --viewport-size=375,812 --color-scheme=dark <url> <file>`), compare the pairs, and list any intended visual differences in the pull request.

## Commit Messages

- Write commit messages in English.
- Use Conventional Commits: `type(scope): summary`, e.g. `fix(sql): ...`, `chore(deps): ...`.
- Explain *why* in the body when the change is not obvious.

## Code Comments

- Do not write comments in Chinese.
- Prefer self-explanatory code: clear names and small functions over comments.
- Add brief English comments only where necessary, e.g. a non-obvious reason, a security constraint, or a workaround.
- User-facing UI strings are not comments and may stay in the language the app uses.
