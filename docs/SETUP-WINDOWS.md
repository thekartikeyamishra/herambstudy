# Setup on Windows (VS Code + PowerShell)

## 1. Prerequisites

```powershell
node --version   # needs v22.12+ (built and tested on 22.22.0)
npm --version    # 10.9+ works; 11.7 is fine
git --version
```

Install Node 22 LTS from nodejs.org (or `nvm-windows`: `nvm install 22.22.0; nvm use 22.22.0`).
Recommended VS Code extensions: ESLint, Tailwind CSS IntelliSense, Playwright Test for VS Code.

## 2. Install and run locally (no Firebase needed)

```powershell
cd heramb-study
npm install
Copy-Item .env.example .env.local
# In .env.local set: DEV_MEMORY_STORE=true
npm run dev
```

Open http://localhost:3000. With `DEV_MEMORY_STORE=true`, invite and contact submissions are stored in memory (lost on restart) so you can test the full flow. Without it, the forms show an honest "storage isn't available" error — that is intended behaviour.

## 3. Firebase setup (needed for real submissions)

1. https://console.firebase.google.com → **Add project** (e.g. `heramb-study`). Google Analytics in Firebase is not required.
2. **Build → Firestore Database → Create database** → *Production mode* → location **asia-south1 (Mumbai)** (closest to Indian users; cannot be changed later).
3. **Project settings → Service accounts → Generate new private key**. Save the JSON **outside** the repository (e.g. `C:\secrets\heramb-admin.json`). Never commit it.
4. Put three values from that JSON into `.env.local`:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   RATE_LIMIT_SALT=<64 random hex chars>
   DEV_MEMORY_STORE=false
   ```
   Generate the salt: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
5. Deploy rules, indexes and the TTL policy:
   ```powershell
   npm install -g firebase-tools
   firebase login
   firebase use --add            # pick your project
   firebase deploy --only firestore:rules,firestore:indexes
   ```
6. `npm run dev`, submit the invite form, then check **Firestore → inviteRequests**. `GET /api/health` should report `"storage":"firestore"`.

### App Check
Not needed today: browsers never talk to Firestore directly (all access is server-side and rules deny clients). Enable App Check with reCAPTCHA Enterprise when the learning app starts using the Firebase client SDK.

### Least-privilege service account (recommended)
Create a dedicated service account with only the **Cloud Datastore User** role and use its key instead of the default `firebase-adminsdk` account.

## 3b. Email (optional)

1. Create an account at resend.com, add and verify your domain (DNS records for SPF/DKIM).
2. Create an API key with "sending" permission.
3. In `.env.local` / your host:
   ```
   RESEND_API_KEY=re_...
   EMAIL_FROM="Heramb.study <hello@heramb.study>"
   EMAIL_TOKEN_SECRET=<64 random hex chars>
   OWNER_NOTIFICATION_EMAIL=you@yourdomain.com
   ```
4. Submit a test invite with "product updates" ticked → you should receive the acknowledgement with a confirm link. Submit a test pilot application → you should receive an alert.

Without these variables everything still works; no email is sent, and confirm/unsubscribe pages explain that links aren't active.

## 3c. AI summaries (optional)

Without this, users get instant rule-based summaries. To enable AI:
```
AI_PROVIDER=anthropic
AI_API_KEY=<your key>          # server-only
AI_MODEL=                      # optional; defaults to the small tier
AI_GLOBAL_DAILY_LIMIT=300      # total AI calls per day across the site (your budget cap)
```
Or `AI_PROVIDER=openai_compatible` with `AI_BASE_URL=https://…/v1` and `AI_MODEL`. Check the provider's current model names and prices before enabling; every call logs `[ai] summary {model, in, out}` token counts so you can track cost.

## 4. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm test` | Unit, integration and component tests (Vitest) |
| `npm run test:e2e` | Playwright on desktop, tablet, mobile + axe scans (first time: `npx playwright install chromium`) |
| `npm run test:rules` | Firestore rules tests (needs Java 11+; downloads the emulator) |
| `npm run check` | typecheck + lint + tests + build |
| `npm run icons` | Regenerate icons from `public/icons/icon.svg` |
| `npm run waitlist -- stats` | Owner-only admin CLI (see below) |

## 5. Managing the waitlist (owner only)

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secrets\heramb-admin.json"
npm run waitlist -- stats
npm run waitlist -- export                    # exports\invites-YYYY-MM-DD.csv / .json
npm run waitlist -- export --marketing-only   # only CONFIRMED (double opt-in) subscribers who haven't unsubscribed
npm run waitlist -- pilots                    # exports\pilots-YYYY-MM-DD.csv / .json
npm run waitlist -- find --email person@example.com
npm run waitlist -- set-status --email person@example.com --status invited
npm run waitlist -- delete --email person@example.com --yes
npm run waitlist -- contacts
```

`exports/` is git-ignored. Delete export files once you're done with them — they contain personal data.

## 6. Data export, backup and recovery

- Ad-hoc export: the CLI above.
- Full backups: enable **Firestore → Disaster recovery → Point-in-time recovery** (7-day window) and/or scheduled exports to a Cloud Storage bucket (`gcloud firestore export gs://<bucket>`), with a lifecycle rule that deletes exports after your retention period.
- Restore: `gcloud firestore import gs://<bucket>/<export-folder>`.
