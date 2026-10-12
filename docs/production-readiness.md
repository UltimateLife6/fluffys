# Production readiness

This document describes local preparation only. It does not create a staging or production environment.

## Database

Local development uses SQLite at `data/fluffys-admin.sqlite` unless `DATA_BACKEND=firebase`. The SQLite file is gitignored and is not deleted by the Firebase import. See `docs/firebase.md` for the Firestore path. `npm run db:migrate` refuses to run while `DATABASE_URL` is set.

Schema versions:

1. The original admin tables.
2. Session activity, catering notification fields, analytics deduplication, stored image metadata, and rate limits.

`npm run db:migrate` applies those changes to the local SQLite file. Application startup does not migrate a database when `NODE_ENV=production` or when `DATABASE_URL` is present. Firestore is not migrated on startup.

### Backup

`npm run db:backup` copies the SQLite file into `data/backups`. Keep that copy private. It contains password hashes and inquiry details.

To recover the local database, stop the server, replace `data/fluffys-admin.sqlite` with the backup, and start the server again. Do not delete the backup after a failed attempt until the site is checked.

### Move to Firestore

The PostgreSQL adapter was removed after the Firebase emulator path was verified. Copy SQLite into the local Firestore emulator with `npm run firebase:import`. That command is a dry run until `--apply`, and `--apply` refuses any host other than localhost. Details and rollback steps are in `docs/firebase.md`.

## Images

Development uploads go to `public/uploads` with generated file names. JPEG, PNG, and WebP files up to 2 MB are accepted after a signature check. Set `BLOB_READ_WRITE_TOKEN` only when Vercel Blob should be used. No file is uploaded by the local tests.

Uploads record metadata in `stored_images`. There is no cleanup job yet. Do not delete a file that a menu record still uses, and leave the existing `/food` images in place.

## Email

Set `EMAIL_PROVIDER` to `resend` or `sendgrid`, plus `EMAIL_FROM` and the matching API key, before a notice can be marked sent. Without those values, a saved inquiry stays `pending` and is not described as emailed.

## Analytics

Website charts read the local `analytics_events` table. GA4 is contacted only when both `NEXT_PUBLIC_GA_MEASUREMENT_ID` and `GA4_API_SECRET` are set and the visitor has allowed analytics. The API secret stays on the server. Order-link clicks are not sales.

## Sessions

A session lasts 12 hours and also ends after 4 idle hours. The cookie is HTTP-only. `Secure` is enabled when `NODE_ENV=production`. Replace the local review passwords and `ADMIN_SESSION_SECRET` before any public host is used.

## Health

`GET /api/health` reports whether the local database file responds, plus whether storage, email, and GA4 are configured. It does not return secrets or row counts.

## Staging checklist

- Local backup exists.
- `npm test`, typecheck, lint, and build pass.
- Owner cannot open Settings or User Management.
- A catering inquiry remains saved when email is not configured.
- The public menu, category filters, and Back button still behave as before.
- `/api/health` returns `ok: true` without secrets.
- `DATA_BACKEND` is unset unless the Firebase emulators are running.
