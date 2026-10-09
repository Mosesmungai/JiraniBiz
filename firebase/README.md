# Firebase setup for JiraniBiz

Firebase project ID: `jiranibiz`

The application uses Cloud Firestore for server-side persistent storage. The Firebase Admin SDK is server-only. Core collections are `users`, `sessions`, `businesses`, `businessSlugs`, `userEmails`, `services`, `leads`, `bookings`, `reviews`, `businessPayments`, `businessReviews`, `business_verifications`, `passwordResetTokens`, and `rateLimits`. Signed-in discovery preferences are stored at `users/{userId}/preferences/discovery`; the API accepts only bounded, strict preference fields.

Business listings use monthly visibility subscriptions: KES 500 for an area, KES 1,000 for a selected region, and KES 2,000 country-wide. Owners may instead start a seven-day trial for their selected scope. New listings require two to five business photos and precise device coordinates with reported accuracy of 100 metres or better. They are not published until location verification is approved; paid plans additionally require administrator confirmation of the submitted payment reference. Owners can submit another monthly payment from the dashboard to extend a trial or active/expired subscription; a renewal under review retains the existing visibility only until its current expiry. Expired trials and subscriptions are excluded from public discovery. Promotion is capped at the top 100 eligible listings in each exact geographic scope, ranked by rating, review count, then business ID.

Payment references are currently reviewed manually; there is no M-Pesa API checkout or webhook. Configure a genuine merchant account before accepting payments. `MPESA_PAYBILL` and `MPESA_TILL_NUMBER` are optional display settings, and if neither is configured the form explicitly tells owners not to send money. An administrator must compare each submitted reference with the provider statement before confirming payment. Do not treat a submitted reference as proof of payment.

Listing photos are uploaded to Firebase Storage as private objects and are served using short-lived signed URLs. Set `FIREBASE_STORAGE_BUCKET` to the bucket name and grant the Firebase service account permission to upload objects and create signed read URLs. Without it, photo upload and signed-photo access will not work.

Discovery keeps recent searches, viewed businesses, category preferences, and manually selected country/city/area labels in browser storage for anonymous use. Signed-in users can sync those same bounded preferences to Firestore. Device latitude, longitude, and reported accuracy are used in memory for nearby sorting only and are never included in local or Firestore preferences. Device location requires browser permission and a secure context (HTTPS in production); manual country, city, and area selection is available across Kenya, Uganda, and Tanzania when location is denied or unavailable. Manual distance estimates use listed-business coordinates in the selected area and are marked approximate; if no coordinates exist, discovery matches the entered location but does not display or sort by distance.

When a business owner opens the listing form, the browser requests device location permission and, after approval, automatically fills the listing's GPS coordinates. Listing creation requires device-reported accuracy of 100 metres or better; poor accuracy must be resolved by retrying, and permission denial prevents submission rather than saving a guessed/default location. Business owners still enter the country, city, and area themselves; exact coordinates are not sent to a reverse-geocoding provider. Device-reported accuracy is an estimate, not a guarantee of the business premises' exact position.

## Environment variables and browser exposure

Keep service credentials and signing secrets in the server/deployment environment. Never prefix them with `NEXT_PUBLIC_`, pass them as client component props, or commit their real values.

| Variable | Purpose | Reaches browser? |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Firebase Admin project selection | No |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service account identity | No |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin service account credential | No |
| `FIREBASE_STORAGE_BUCKET` | Server-side upload and signed-URL bucket | The value is not sent by itself; its bucket identifier appears in generated signed media URLs |
| `SESSION_SECRET` | HMAC signing/hashing for sessions and rate-limit keys | No |
| `APP_BASE_URL` | Origin for password-reset links | Yes, as the origin of links sent by email |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Server-side SMTP transport | No |
| `EMAIL_FROM` | Password-reset sender identity | No |
| `MPESA_PAYBILL`, `MPESA_TILL_NUMBER` | Merchant instructions displayed in dashboard forms | Yes; these are intentionally public payment destinations, not credentials |
| `JIRANIBIZ_SQLITE_PATH` | Optional local migration-script database path | No |
| `NODE_ENV` | Runtime cookie security and mail transport behavior | No |

There are no `NEXT_PUBLIC_*` variables in the application. The existing `.env.local` is ignored by Git and was not inspected. `FIREBASE_PROJECT_ID` and the storage bucket name are identifiers, not authentication credentials; still keep Admin SDK initialization in server-only modules.

Use a unique, randomly generated `SESSION_SECRET` for each deployment environment. Password resets invalidate sessions issued before the password change. Set all SMTP values before enabling the reset flow; production reset links require an HTTPS `APP_BASE_URL`.

## Firestore rules, ownership, and direct client access

This project has no SQL tables, Supabase, or `auth.uid()` policies. It uses Cloud Firestore and the Firebase Admin SDK. Admin SDK requests bypass Firestore Security Rules, so the route handlers must enforce session authentication, role checks, and ownership. Browser SDK access is not used by the application.

The checked-in [`firestore.rules`](../firestore.rules) deny all direct client reads and writes to every Firestore document, including nested preferences. [`storage.rules`](../storage.rules) likewise denies direct client Storage access; the server uses Admin SDK uploads and short-lived signed read URLs. Do not loosen these rules to permit browser database access without adding Firebase Authentication and independently validated rules. Deploy the rules using `firebase deploy --only firestore:rules,storage --project jiranibiz`.

The `rateLimits` collection stores HMAC-keyed counters with an `expiresAt` timestamp. Configure Firestore TTL so old counters are removed:

```sh
gcloud firestore fields ttls update expiresAt --collection-group=rateLimits --enable-ttl --project jiranibiz
```

The deployment ingress must overwrite or sanitize `X-Real-IP`/`X-Forwarded-For`; rate-limit correctness depends on receiving a trusted client address rather than a caller-controlled header.

### API route ownership matrix

| Route and method | Access and identity/ownership enforcement |
| --- | --- |
| `GET /api/businesses` | Publicly visible businesses are public. A signed-in business owner receives only the list filtered by the session user ID. |
| `POST /api/businesses` | Business owner or admin only. Business `ownerId` comes from the session; client-supplied owner/user IDs are rejected. Admin-created listings have no owner ID. |
| `POST /api/businesses/verify-location` | Business owner or admin only. A business owner must match the stored business `ownerId`; admin may act across businesses. |
| `POST /api/businesses/[id]/payment` | Business owner only; the store transaction compares the stored `ownerId` to the session user ID. |
| `GET /api/bookings` | Session required. Customers get their bookings by session `customerId`; business owners get bookings only for businesses owned by their session user. |
| `POST /api/bookings` | Session required; `customerId` is derived from the session. Business and optional service are checked server-side, including that the service belongs to the requested business. |
| `GET /api/bookings/[id]` | Customer, owning business, or admin only. Unrelated/missing bookings return `404`. |
| `PATCH /api/bookings/[id]` | Customer may edit schedule/notes while `Requested`; owning business may transition status; admin may manage. Unrelated/missing bookings return `404`. |
| `DELETE /api/bookings/[id]` | Customer may delete only their own `Requested` booking; admin may delete any. Owning business cannot delete. Unrelated/missing bookings return `404`. |
| `GET /api/services` | Public service catalog for the requested business. |
| `POST /api/services` | Business owner or admin only. The store checks business existence and requires an owner to match its stored `ownerId`; admin may act across businesses. |
| `GET /api/reviews` | Public reviews for the requested business. |
| `POST /api/reviews` | Session required; `customerId` is derived from the session and only one review per customer/business is accepted. |
| `POST /api/leads` | Public submission, optionally linked to the session user. The business is resolved server-side from `businessSlug`; client-supplied identity and business name are not accepted. No lead read/update/delete API is currently exposed. |
| `GET /api/preferences`, `PUT /api/preferences` | Signed-in user only for persisted preferences; the Firestore path uses the session user ID. |
| `POST /api/admin/businesses/[id]/review` | Admin role only; `adminId` comes from the session. |
| `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/password-reset`, `POST /api/auth/password-reset/confirm`, `GET /api/auth/me`, `POST /api/auth/logout` | Authentication lifecycle routes; account identity is resolved server-side. Registration accepts only `customer` or `business_owner`, never `admin`. |

### Strict request schemas and server-owned fields

All JSON schemas are strict: unknown fields fail with `400`. Multipart forms reject unknown keys, repeated scalar fields, and malformed values. Upload parsers enforce actual streamed body size even when `Content-Length` is absent: business listing requests are capped at 55 MiB and location-verification requests at 11 MiB; each image is capped at 10 MiB. Exact Zod constraints are named per route below and defined in [`request-schemas.ts`](../src/lib/request-schemas.ts); discovery preference internals are validated in [`discovery-preferences.ts`](../src/lib/discovery-preferences.ts).

| Route/method | Accepted body fields |
| --- | --- |
| `POST /api/auth/login` | `{ email, password }` |
| `POST /api/auth/register` | `{ name, email, phone?, password, role? }`; `role` is only `customer` or `business_owner` |
| `POST /api/auth/logout`, `GET` routes | No body |
| `POST /api/auth/password-reset` | `{ email }` |
| `POST /api/auth/password-reset/confirm` | `{ token, password }` |
| `POST /api/businesses` | Multipart scalar fields `name, category, city, area, country, region, description, phone, email, planId, trial, location`; repeated `photos` files only |
| `POST /api/businesses/verify-location` | Multipart `businessId, photo, latitude, longitude, accuracy` |
| `POST /api/businesses/[id]/payment` | `{ reference }` |
| `POST /api/admin/businesses/[id]/review` | `{ action }`; action is one of the four review actions |
| `POST /api/bookings` | `{ businessId, serviceId?, scheduledAt, notes? }` |
| `PATCH /api/bookings/[id]` | Customer: `{ scheduledAt?, notes? }`; owning business/admin: `{ status }` with valid transitions |
| `DELETE /api/bookings/[id]`, item `GET` routes | No body |
| `POST /api/services` | `{ businessId, name, description?, price? }` |
| `POST /api/reviews` | `{ businessId, rating, comment? }` |
| `POST /api/leads` | `{ businessSlug, name, phone, message }` |
| `PUT /api/preferences` | `{ preferences }`; every preference object and nested record must have exactly its documented keys and stay within configured collection limits |

Clients must never set account/business/booking/review/lead IDs, `userId`, `ownerId`, `customerId`, `adminId`, `passwordHash`, timestamps, `createdAt`, verification/publication state, payment-review state, subscription records, or subscription amount fields. The booking-status field is accepted only for the owning business/admin status-transition operation. `reference` is accepted only as a claimed manual M-Pesa transaction reference and is not proof of payment. Business service `price` is the owner-maintained catalog price, not a subscription charge.

### Rate limits and exceeded response

Limits are shared across app instances using transactional Firestore counters. Identifier values are HMACed with `SESSION_SECRET`; raw IP addresses, emails, and reset tokens are not stored in rate-limit documents. Every Firebase-backed API route has an IP- or user-scoped limiter; upload endpoints have tighter limits.

| Route | Limit |
| --- | --- |
| `POST /api/auth/login` | 60/IP/minute general; 20/IP/15 minutes; 5 per email+IP/15 minutes |
| `POST /api/auth/register` | 60/IP/minute general; 5/IP/hour; 3 per normalized email/day |
| `POST /api/auth/password-reset` | 60/IP/minute general; 10/IP/hour; 3 per normalized email/hour |
| `POST /api/auth/password-reset/confirm` | 60/IP/minute general; 20/IP/15 minutes; 5 per reset token/15 minutes |
| `GET /api/auth/me`, `POST /api/auth/logout` | 60/IP/minute |
| Public listing/catalog reads (`GET /api/businesses`, `GET /api/services`, `GET /api/reviews`) | 60/IP/minute |
| `GET /api/bookings`, `GET /api/preferences` | 60/IP/minute and 60/session-user/minute |
| `PUT /api/preferences` | 30/IP/hour and 30/session-user/hour |
| `POST /api/businesses`, `POST /api/businesses/verify-location` | 3/IP/hour and 3/session-user/hour |
| `POST /api/businesses/[id]/payment` | 10/IP/hour and 10/session-user/hour |
| `POST /api/bookings` | 20/IP/hour and 20/session-user/hour |
| `GET`, `PATCH`, `DELETE /api/bookings/[id]` | 30/IP/hour and 30/session-user/hour per operation |
| `POST /api/services`, `POST /api/reviews` | 20/IP/hour and 20/session-user/hour |
| `POST /api/leads` | 10/IP/hour |
| `POST /api/admin/businesses/[id]/review` | 30/IP/hour and 30/session-user/hour |

An exceeded limit returns `429` with JSON `{ "error": "Too many requests. Please try again later.", "retryAfterSeconds": <seconds> }` and a matching `Retry-After` header.

### Password reset

Reset requests require `APP_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`. The system stores only an HMAC of a random, single-use reset token, which expires after 30 minutes. Successful password changes invalidate pre-existing sessions. A validly configured request responds with the same generic message whether or not the email belongs to an account.

## Subscription pricing and payment verification

Subscription `planId` is the product identifier. The server looks it up in `SUBSCRIPTION_PLANS` (`area` = KES 500/month, `region` = KES 1,000/month, `country` = KES 2,000/month) and stores the computed price. A request cannot set `monthlyPriceKsh` or `amountKsh`; submitted payment references use the stored subscription price.

The app uses manually reviewed M-Pesa references. There is no Stripe SDK, Stripe Checkout, Stripe webhook, or Stripe signature-verification handler. Do not treat a user-submitted reference as a provider payment confirmation.

## Credential rotation

Historical revisions of the tracked environment example contain values shaped like Firebase service-account credentials and a session-signing key. Treat any matching credential that is still active as compromised. Replacing the current example file does not erase Git history.

1. In Firebase/Google Cloud IAM, identify and revoke every historical service-account key; create a fresh least-privilege key only if a key is still required by the server deployment.
2. Replace `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in the deployment secret store. Never paste them into chat, tickets, or source control.
3. Generate a new random `SESSION_SECRET` and set it in every deployment environment. This intentionally invalidates existing sessions; users will need to sign in again.
4. Redeploy, verify authenticated Firestore and Storage operations, then confirm the old keys are disabled/deleted in the provider console.
5. Review Git history and access logs. Consider a coordinated history rewrite only if policy requires removing historical blobs; rotation/revocation is still required even after rewriting.

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
4. Add the Firebase credentials, `SESSION_SECRET`, and configured password-reset email settings above to the deployment platform.
5. Deploy Firestore and Storage rules from the repository root using the command in the rules section.

Do not commit the service-account JSON file or private key to GitHub.
