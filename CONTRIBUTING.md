# Contributing to Assay

Thanks for helping. Assay is small and run by one maintainer, so a short,
focused pull request with tests is the fastest way to get a change in.

## Before you start

- For anything larger than a fix, open an issue first and describe the
  problem. A quick agreement on the approach saves a rewrite.
- Read [AGENTS.md](AGENTS.md) (workflow and repository rules) and
  [docs/engineering.md](docs/engineering.md) (invariants and public
  contracts). UI changes also follow [DESIGN.md](DESIGN.md).

## Setting up

```bash
npm install
npm run dev:services          # local MongoDB, PostgreSQL and Redis (compose.yaml)
cp .env.example .env.local    # then use the local values from README.md
npm run seed:demo             # optional demo schema and checks
npm run dev
```

Tests never touch real services: MongoDB, PostgreSQL, Redis, AI and chat APIs
are mocked. The integration suites run against a throwaway MongoDB when
`MONGODB_TEST_URI` is set (CI sets it).

## Making a change

1. Branch from `main` (`fix/…`, `feat/…`, `docs/…`) and open the pull request
   against `main`.
2. Keep commits small, one logical change each, with Conventional Commit
   messages in English (`fix(sql): …`, `feat(notify): …`). Explain why in
   the body when it is not obvious.
3. Add or update tests with every behaviour change, especially SQL
   validation, auth and permissions.
4. Run the checks CI runs:

   ```bash
   npm run typecheck && npm run lint && npm test && npx knip && npm run build
   ```

   CI runs the tests as `npm run test:coverage`, which also enforces the
   coverage floors in `vitest.config.mts`, and runs the MongoDB integration
   suites against a throwaway database. To do the same locally, with the
   local services up:

   ```bash
   MONGODB_TEST_URI=mongodb://127.0.0.1:27017/assay_test npm run test:coverage
   ```

5. For UI changes, compare screenshots (`npm run visual:baseline` before,
   `npm run visual` after; see DESIGN.md) and label a pull request that
   changes the look on purpose `visual-change`.

## Rules that are not negotiable

- Checks are read-only. Never weaken the SQL validator, the read-only
  transaction or the statement timeout.
- Secrets stay sealed and out of logs and API responses.
- Never commit secrets, env files, database dumps or generated output. The
  repository is public, and history keeps everything.

By contributing you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE), and you follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
