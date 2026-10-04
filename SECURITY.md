# Security policy

## Reporting a vulnerability

Please do not put details of a security problem in a public issue. Open an
issue titled **"Security contact request"** with no details at all, and the
maintainer replies with a private channel to send the report to.

Include what you found, how to reproduce it, and the impact you expect. You
will get an answer within seven days. Fixes are released as soon as they are
ready, and you are credited unless you ask not to be.

## Scope

In scope: this repository and the demo at assay.majincheng.com. Areas that
matter most:

- SQL that is not read-only getting through the validator or the
  read-only transaction;
- reading or changing data across roles (viewer, developer, admin) or as a
  demo guest;
- secrets (data-source connection strings, channel webhooks, API keys)
  leaving the server;
- SSRF through data sources, webhooks or OAuth client metadata.

Out of scope: denial of service by volume, reports from automated scanners
without a working proof, and the demo's deliberately public sample data.

## Supported versions

Only the latest `main`, which is what the demo runs, receives fixes.
