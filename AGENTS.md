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

## Commit Messages

- Write commit messages in English.
- Use Conventional Commits: `type(scope): summary`, e.g. `fix(sql): ...`, `chore(deps): ...`.
- Explain *why* in the body when the change is not obvious.

## Code Comments

- Do not write comments in Chinese.
- Prefer self-explanatory code: clear names and small functions over comments.
- Add brief English comments only where necessary, e.g. a non-obvious reason, a security constraint, or a workaround.
- User-facing UI strings are not comments and may stay in the language the app uses.
