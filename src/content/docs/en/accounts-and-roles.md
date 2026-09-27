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

## Changes that need approval

Admins' changes take effect at once. For everyone else, creating a check, editing someone else's check and deleting a check wait for approval. Editing your own check does not. See [Approvals](/docs/approvals).

## See also

- [Managing users](/docs/managing-users)
- [Approvals](/docs/approvals)
