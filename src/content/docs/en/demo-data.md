# Demo data

Try Assay without your own data. The seed creates a `demo` schema in `DATABASE_URL` — customers, orders, payments and inventory with data problems planted in them — and 11 checks in MongoDB that find those problems.

```bash
npm run seed:demo
```

It only touches the `demo` schema and checks authored by `demo-seed`, so it is safe to run again; it resets them.

To fill the history straight away, run every check once:

```bash
DOTENV_CONFIG_PATH=.env.local npm run sql:run-all
```

## See also

- [Quick start](/docs/quick-start)
