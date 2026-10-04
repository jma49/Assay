# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it
privately through GitHub: **Security → Report a vulnerability** on
[github.com/jma49/Assay](https://github.com/jma49/Assay/security), or email
the maintainer at the address on the GitHub profile.

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
