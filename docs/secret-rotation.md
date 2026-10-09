# ASSAY_SECRET_KEY rotation and recovery

`ASSAY_SECRET_KEY` is a 32-byte random key, base64 (`openssl rand -base64
32`). `src/server/crypto/secret-box.ts` derives a key per purpose with HKDF
and seals with AES-256-GCM; sealed values carry a version prefix (`v1`).
It seals:

- `data_sources.connection`: added data-source connection strings;
- `notification_destinations.sealed`: alert channel secrets such as webhook
  URLs.

It also signs short-lived tokens (OAuth `state`), which expire by
themselves and need no migration.

## Rotation

Sealed fields are encrypted, not hashed, and there is no dual-key support:
a new key makes every sealed field unreadable unless it is re-sealed, and
writers must pause while that runs.

1. Generate the new key and keep the old one at hand.
2. Write an offline migration (`tsx`, like `scripts/migrations/`) with a dry
   run by default: for every document in `data_sources` and
   `notification_destinations`, open the sealed field with the old key,
   seal it with the new one, and verify the round trip.
3. Dry-run it. Every value must open with the old key; one that does not is
   already corrupt, so fix it first.
4. Pause the app (stop writes).
5. Run it with `--apply`, then dry-run again: zero values may remain under
   the old key.
6. Set `ASSAY_SECRET_KEY` to the new value in Vercel (all environments),
   the GitHub repository secret and any `.env.local`.
7. Restart. Run one check on an added data source and send one test
   notification.
8. Back up the new key with its date (below).

Rotation without a pause (`ASSAY_SECRET_KEY_PREVIOUS`, open with either
key, re-seal in the background) is on the [roadmap](roadmap.md#later).

## Backup

Database backups never contain the key, so back it up separately: in a
password manager or secrets vault, with the date it took effect. Do this
when the key is first set and after every rotation.

## If the key is lost

There is no recovery: AES-256-GCM cannot be brute-forced and there is no
reset path.

1. Restore the key from its backup; the sealed fields open again at once.
2. With no copy: delete the sealed fields and re-enter every data-source
   connection string and alert-channel secret by hand. Everything else
   (checks, runs, destinations' other settings, sign-in) survives.
