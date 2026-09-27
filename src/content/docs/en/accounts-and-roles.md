# Accounts and roles

## Signing up

Anyone can create an account with an email address or Google. A new account gets the **viewer** role. An admin can then give it more access in [Users](/docs/managing-users).

Self-hosted workspaces can limit sign-up to company domains with `ALLOWED_EMAIL_DOMAINS` (see [Environment variables](/docs/environment-variables)).

## Roles

| Permission | Viewer | Developer | Manager | Admin |
|---|:-:|:-:|:-:|:-:|
| Read checks and results | ✓ | ✓ | ✓ | ✓ |
| Create and edit checks | | ✓ | ✓ | ✓ |
| Run checks | | ✓ | ✓ | ✓ |
| Delete checks | | | ✓ | ✓ |
| Approve or reject changes | | | ✓ | ✓ |
| Assign developer and viewer roles | | | ✓ | ✓ |
| Assign any role, manage users | | | | ✓ |
| Clear caches and maintenance | | | | ✓ |

## The public demo

When a workspace runs with `DEMO_MODE=true`, viewers can also run the seeded sample checks, up to 20 runs an hour, so visitors can watch a check find problems. They still cannot run anyone else's checks or change anything.

In demo mode, **Try the live demo** on the home page also lets visitors in without an account, as a **guest**. A guest can read everything a viewer can and run the sample checks, limited per IP address (20 an hour) and across all guests (200 an hour). A guest can read saved AI triage but cannot start a new AI request, and pages that need an account (new check, approvals, users) lead to sign-up. **Leave Demo** in the Assay menu ends the session.

## Changes that need approval

Admins' changes take effect at once. For everyone else, creating a check, editing someone else's check and deleting a check wait for approval. Editing your own check does not. See [Approvals](/docs/approvals).

## See also

- [Managing users](/docs/managing-users)
- [Approvals](/docs/approvals)
