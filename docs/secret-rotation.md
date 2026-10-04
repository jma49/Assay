# ASSAY_SECRET_KEY Rotation and Recovery

`ASSAY_SECRET_KEY` seals the secrets users enter in the app. It is a 32-byte
random key, base64-encoded. The sealing code lives in
`src/server/crypto/secret-box.ts`: every purpose gets its own key derived
from it with HKDF, and encryption is AES-256-GCM. Sealed data currently
carries a version prefix (`v1`).

Fields sealed under this key today:

- `data_sources.connection` — added data-source connection strings
  (`src/server/services/data-sources.ts`).
- `notification_destinations.sealed` — alert channel secrets such as
  webhook URLs (`src/server/services/destinations.ts`).

The key also signs short-lived tokens (OAuth `state`). Those expire on
their own; rotation does not need to migrate them.

## Why rotation is hard

Sealed fields are encrypted, not hashed. Changing the key invalidates every
sealed field at once: the app cannot read them back with the new key. The
only way to rotate is a re-seal migration: decrypt every sealed field with
the old key and encrypt it again with the new key. There is no dual-key
support today, so writers must pause while the migration runs.

## Rotation procedure

1. Generate the new key: `openssl rand -base64 32`. Keep the old value at
   hand.
2. Write an offline migration script (run with `tsx`, same style as
   `scripts/migrations/`). It must support a dry-run mode:
   - For every document in `data_sources` and `notification_destinations`,
     decrypt the sealed field with the old key, re-encrypt it with the new
     key, and verify the round trip (decrypt the new value with the new
     key and compare to the plaintext).
   - In dry-run mode, print what would change and write nothing.
3. Run the script in dry-run mode first. Every sealed value must decrypt
   with the old key. Fix failures before continuing: a value that does not
   decrypt with the old key is already corrupt.
4. Pause the app (stop writes; the app cannot seal or open while the key is
   in flux).
5. Run the migration with `--apply`.
6. Re-run it in dry-run mode: it must report zero remaining values sealed
   under the old key.
7. Set `ASSAY_SECRET_KEY` to the new value in Vercel (all environments) and
   in any local `.env.local`.
8. Restart the app. Run one check and one test notification to confirm the
   sealed values open under the new key.
9. Store the new key with its date; see the backup guidance below.

## Key versioning (future)

The sealed format already carries a version prefix. A future design:

- Read `ASSAY_SECRET_KEY` (current) plus `ASSAY_SECRET_KEY_PREVIOUS`
  (optional).
- `seal` always uses the current key; `open` tries the current key first,
  then the previous key.
- A background pass re-seals values still under the previous key.

That design allows rotation without pausing the app. It does not exist
yet; the procedure above is the only supported rotation.

## Key backup

Back the key up separately from the database backup, which never contains
it ([backup-restore.md](backup-restore.md)):

- Store the key in a password manager or a secrets vault, with the date it
  took effect.
- Keep a sealed copy under the control of two maintainers, so one person's
  loss does not lose the key (see the "Secret key backup" goal in
  `docs/roadmap.md`).

## If the key is lost

There is no recovery. Without the key, the sealed fields are unrecoverable:
AES-256-GCM cannot be brute-forced, and there is no reset path. You have
two options, in this order:

1. Restore the key from its separate backup (the password manager or the
   sealed maintainer copy). The sealed fields in the database become
   readable again immediately; nothing needs re-entry.
2. If no copy of the key exists: delete the sealed fields and re-enter
   every data-source connection string and every alert-channel secret by
   hand. Non-secret data survives: check definitions, run history,
   notification destinations' non-secret settings, and sign-in all stay
   intact.

Guard against this failure: make key backup part of every deploy that
first sets `ASSAY_SECRET_KEY`, and verify it again after every rotation.
