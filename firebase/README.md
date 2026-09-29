# Firebase setup for JiraniBiz

Firebase project ID: `jiranibiz`

The application is being migrated to Firebase/Cloud Firestore for persistent production storage.

## Required server environment variables

Set these in the deployment environment; do not commit service-account credentials:

- `FIREBASE_PROJECT_ID=jiranibiz`
- `FIREBASE_CLIENT_EMAIL=<Firebase service account client email>`
- `FIREBASE_PRIVATE_KEY=<Firebase service account private key>`

The private key should be stored as a deployment secret/environment variable, with escaped newlines handled by the application.

## Firebase console

1. Open the Firebase project `jiranibiz`.
2. Enable Cloud Firestore.
3. Create a server/service account credential for the Next.js server.
4. Add the three environment variables above to the deployment platform.

Do not commit the service-account JSON file or private key to GitHub.
