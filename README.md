# JiraniBiz

JiraniBiz helps customers discover local service providers and gives businesses tools to manage listings, booking requests, and visibility subscriptions across East Africa.

## Run locally

Requirements: Node.js and npm.

```sh
npm install
cp .env.example .env.local
# Add server-side Firebase settings and a unique SESSION_SECRET to .env.local.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Data and deployment

The app uses Cloud Firestore through the server-side Firebase Admin SDK. Configure the Firebase credentials and session secret only in the local or deployment secret store. See [Firebase setup, security, and migration](./firebase/README.md) for environment-variable exposure, access rules, credential rotation, and SQLite import instructions.
