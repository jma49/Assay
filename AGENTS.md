# Agent Guidelines

## Workflow

- Never commit directly to `main`. Create a branch from `main` (e.g. `fix/...`, `feat/...`, `chore/...`).
- Keep commits small and focused: one logical change per commit.
- Before every commit, make sure these pass:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
- Add or update tests alongside behavior changes, especially for security-sensitive code (SQL validation, auth, RBAC).

## Commit Messages

- Write commit messages in English.
- Use Conventional Commits: `type(scope): summary`, e.g. `fix(sql): ...`, `chore(deps): ...`.
- Explain *why* in the body when the change is not obvious.

## Code Comments

- Do not write comments in Chinese.
- Prefer self-explanatory code: clear names and small functions over comments.
- Add brief English comments only where necessary, e.g. a non-obvious reason, a security constraint, or a workaround.
- User-facing UI strings are not comments and may stay in the language the app uses.
