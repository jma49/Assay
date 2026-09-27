# Deployment

Assay is a Next.js app. You bring a Clerk application, MongoDB, the PostgreSQL database to check and an Upstash Redis cache.

## Prerequisites

- Node.js 20 or later
- A PostgreSQL database for the checks to read (a read-only user is recommended)
- MongoDB (Atlas works)
- Upstash Redis
- A Clerk application

## Run it locally

```bash
git clone https://github.com/jma49/Assay.git
cd Assay && npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Then make yourself an admin:

```bash
npm run user:set-role -- you@example.com admin
```

## Deploy to Vercel

1. Import the repository into Vercel.
2. Add the variables from [Environment variables](/docs/environment-variables) to the project.
3. Deploy. Pushes to `main` deploy to production.

## Scheduled runs

Scheduled checks need something to start them; see [Scheduling](/docs/scheduling).

## Security checklist

- Give Assay a PostgreSQL user that can only `SELECT`. Checks already run read-only, but a read-only user is a second lock.
- Set `ALLOWED_EMAIL_DOMAINS` if only your company should sign in.
- Keep secrets in the host's environment, never in the repository.

## See also

- [Environment variables](/docs/environment-variables)
- [Demo data](/docs/demo-data)
