# Firebase setup for JiraniBiz

Firebase project ID: `jiranibiz`

The application uses Cloud Firestore for server-side persistent storage. The Firebase Admin SDK is server-only. Core collections are `users`, `sessions`, `businesses`, `businessSlugs`, `userEmails`, `services`, `leads`, `bookings`, and `reviews`. Signed-in discovery preferences are stored at `users/{userId}/preferences/discovery`; the API only accepts bounded, validated preference fields.

Discovery keeps recent searches, viewed businesses, category preferences, and manually selected country/city/area labels in browser storage for anonymous use. Signed-in users can sync those same bounded preferences to Firestore. Device latitude, longitude, and reported accuracy are used in memory for nearby sorting only and are never included in local or Firestore preferences. Device location requires browser permission and a secure context (HTTPS in production); manual country, city, and area selection is available across Kenya, Uganda, and Tanzania when location is denied or unavailable. Manual distance estimates use listed-business coordinates in the selected area and are marked approximate; if no coordinates exist, discovery matches the entered location but does not display or sort by distance.

## Required server environment variables

Set these in the deployment environment; do not commit service-account credentials:

- `FIREBASE_PROJECT_ID=jiranibiz`
- `FIREBASE_CLIENT_EMAIL=<Firebase service account client email>`
- `FIREBASE_PRIVATE_KEY=<Firebase service account private key>`
- `SESSION_SECRET=<long random session-signing secret>`

The private key should be stored as a deployment secret/environment variable, with escaped newlines handled by the application.
Generate a unique `SESSION_SECRET` for each environment; session creation and validation fail explicitly when it is absent.

## Migrate the existing SQLite data

Run the local schema migration first. It upgrades the legacy `businesses` and `leads` payload schema in a transaction and records the completed version in SQLite's `user_version`. It does not run automatically when the application starts.

```sh
npm run migrate:sqlite
```

Validate the local SQLite source and print document counts without contacting Firestore:

```sh
npm run migrate:firestore
```

This default dry-run does not check for destination conflicts because it does not connect to the project. The write command performs a remote preflight before creating any documents.

After configuring the Firebase Admin environment variables above, explicitly run the import:

```sh
npm run migrate:firestore -- --write
```

The importer preserves SQLite document IDs and existing Firestore documents. It skips records already imported with identical data and stops before writing if a destination ID contains different data. It writes in batches using create-only operations, so a concurrent destination write is never overwritten. A failed run can be safely repeated after resolving the reported conflicts.

Keep the SQLite database and its WAL files until Firestore data and application behavior have been verified. Do not put service-account credentials in source control, logs, or chat.

## Firebase console

1. Open the Firebase project `jiranibiz`.
2. Enable Cloud Firestore.
3. Create a server/service account credential for the Next.js server.
4. Add the Firebase credentials and `SESSION_SECRET` above to the deployment platform.

Do not commit the service-account JSON file or private key to GitHub.
