# Firebase backend

This is a local integration. It does not create a Firebase project, deploy rules, or upload files.

Set `DATA_BACKEND=firebase` to make the website and admin read Firestore. Leave it unset to keep using SQLite. Firebase mode does not open the SQLite file.

Remote Firebase is refused unless `FIREBASE_ALLOW_REMOTE=1` is set on purpose. The import and seed commands also refuse any host other than the local emulators.

## Collections

- `adminUsers` — profile and role. Passwords stay in Firebase Auth.
- `menuCategories`, `menuItems`
- `truckStops`, `cateringPackages`, `cateringInquiries`
- `promotions`, `siteContent`, `siteSettings`
- `analyticsEvents`, `auditLogs`, `storedImages`
- `sessions` — idle timeout for the HTTP-only session cookie
- `loginAttempts`, `rateLimits`
- `inquiryKeys`, `analyticsKeys` — duplicate prevention
- `notificationAttempts`, `siteRevisions`

Document IDs match the existing SQLite IDs. Client reads and writes are denied by `firebase/firestore.rules`. The server uses the Admin SDK. Storage rules also deny direct client access. The site serves uploaded images through `/uploads/[filename]`.

## Accounts

There is no public registration. A Noctaris admin creates accounts from the dashboard. Firebase Auth stores the password, and a custom claim stores `OWNER` or `NOCTARIS_ADMIN`. The server checks that claim, the Firestore profile, and the Auth disabled flag on every request. Disabling an account revokes its sessions.

Sign-in uses the same “email or password is incorrect” message for a missing account, a wrong password, and a disabled account. Sessions last 12 hours and also end after 4 idle hours.

## Local emulators

The Firestore emulator needs a local Java 21 runtime. This repository does not install Java globally.

```bash
npm run firebase:emulators
```

In another terminal:

```bash
DATA_BACKEND=firebase \
FIREBASE_PROJECT_ID=fluffys-local \
FIREBASE_STORAGE_BUCKET=fluffys-local.appspot.com \
FIRESTORE_EMULATOR_HOST=127.0.0.1:18080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:19099 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:19199 \
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fluffys-local \
npm run dev
```

`npm run firebase:seed` creates the local owner and Noctaris accounts from `.env.local` inside the Auth emulator. It does not print passwords.

`npm run test:firebase` runs the emulator test suite. `npm test` still runs the SQLite suite and skips the emulator test when the emulators are not running.

## SQLite copy

`npm run firebase:import` is a dry run. It prints counts, draft and published totals, and orphan menu items. It does not write to Firestore and it does not include password hashes.

`npm run firebase:import -- --export data/exports/firestore-plan.json` writes a private JSON copy. That folder is gitignored.

`npm run firebase:import -- --apply` writes only when both emulator hosts are local. Existing Firestore documents are skipped, so running it twice does not duplicate rows. SQLite and `data/backups` are not modified or deleted.

Passwords cannot be copied. Node scrypt hashes are not Firebase Auth hashes. After a data import, run `firebase:seed` for the local review accounts, or create new passwords from User Management.

## Rollback

1. Stop the server.
2. Unset `DATA_BACKEND` so the app uses SQLite again.
3. To restore emulator data, start the emulators with `--import data/emulator-export` after an `--export-on-exit` copy.
4. Keep the SQLite backup until the restored site has been checked.

## Console setup later

These steps are manual and were not performed:

1. Create a Firebase project.
2. Enable Email/Password authentication and do not add a public sign-up page.
3. Create Firestore and Storage.
4. Deploy `firebase/firestore.rules` and `firebase/storage.rules`.
5. Create a service account, put `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` only in the server environment, and set `FIREBASE_ALLOW_REMOTE=1` only for that reviewed project.
6. Replace the local review passwords and session secret before any public host.
