# Deployment

Two supported options. **Vercel** is the simplest for Next.js; **Firebase App Hosting** keeps everything in one Google project. Both serve static pages from a CDN and run the two API routes on Node.

## Updating the repository from a release zip (do this every time)

Copying a zip over the repository adds and replaces files but **never deletes** files a newer release removed. Those leftovers still get type-checked on Vercel and can fail the build. The v0.7 deploy failure (`api/dev/reset/route.dev.ts … has no exported member 'devResetMemory'`) was exactly this.

To replace the code cleanly in Windows PowerShell, run these from the repository folder:

```powershell
# 1. Start from a clean, committed state
git status

# 2. Remove every tracked file (your .git, .env.local and node_modules are untouched)
git rm -r -q .

# 3. Unpack the release and copy it in, including dot-files such as .gitignore and .env.example
Expand-Archive -Path "$HOME\Downloads\Heramb-v0.7.1.zip" -DestinationPath "$env:TEMP\heramb-release" -Force
robocopy "$env:TEMP\heramb-release\heramb-study" . /E /NFL /NDL /NJH /NJS

# 4. Stage everything. Deleted leftovers show as "deleted"; review before committing
git add -A
git status

# 5. Verify locally, then ship
npm ci
npm run check
git commit -m "Release v0.7.1"
git push
```

- **Paste-over updates are fine too** (extract, cut `heramb-study`, paste on `E:\` and replace): afterwards run `npm run clean:stale`, then `git add -A` and commit. See `HOW-TO-UPDATE.txt`.
- **Before every build:** `scripts/check-release-files.mjs` runs first. On Vercel it removes leftover code files automatically and lists them; on your computer it stops and asks you to run `npm run clean:stale`.
- **Never “Redeploy” an old failed deployment** — it rebuilds that old commit. Push a new commit, or redeploy the newest row. `/api/health` shows the live `version` and `commit`.
- **Files you added on purpose:** run `npm run release:manifest` and commit `scripts/release-manifest.json`.
- **Node version warning:** in Vercel → Project → Settings → General → Node.js Version, choose **22.x**. This matches `engines` in `package.json` and silences the "24.x will not apply" warning.

## Option A — Vercel (recommended for simplicity)

1. Push the repository to GitHub (private).
2. vercel.com → **Add New Project** → import the repo. Framework: Next.js (auto). Node: 22.x.
3. **Environment variables** (Production):
   - `NEXT_PUBLIC_SITE_URL=https://heramb.study` (your real domain, https, no trailing slash)
   - `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (paste with `\n` sequences), `RATE_LIMIT_SALT`
   - Optional email: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TOKEN_SECRET`, `OWNER_NOTIFICATION_EMAIL`.
   - Leave `DEV_MEMORY_STORE` unset; leave AdSense disabled.
   - For **Preview** deployments set `NEXT_PUBLIC_SITE_URL` to the preview URL or leave it — `robots.txt` blocks crawling on previews either way (`VERCEL_ENV=preview`).
4. Set the function region close to Firestore (Settings → Functions → `bom1` Mumbai).
5. Deploy. Then: **Domains → add `heramb.study` and `www.heramb.study`**, set the DNS records Vercel shows, and redirect `www` → apex.

## Option B — Firebase App Hosting

1. Firebase console → **App Hosting → Get started** → connect GitHub repo, root `/`, live branch `main`, region `asia-south1`.
2. Secrets: `firebase apphosting:secrets:set rateLimitSalt` (already referenced in `apphosting.yaml`).
3. `apphosting.yaml` sets `FIREBASE_USE_ADC=true` — the App Hosting service account authenticates to Firestore automatically. Grant it **Cloud Datastore User** if needed.
4. Edit `NEXT_PUBLIC_SITE_URL` in `apphosting.yaml` to your domain, add `NEXT_PUBLIC_OPERATOR_NAME` / `NEXT_PUBLIC_CONTACT_EMAIL`.
5. App Hosting → **Custom domain** → follow the DNS steps.

## Post-deploy verification

```powershell
curl.exe -s https://heramb.study/api/health          # {"ok":true,"storage":"firestore"}
curl.exe -sI https://heramb.study/ | findstr /i "content-security strict-transport x-frame"
curl.exe -s https://heramb.study/robots.txt          # must ALLOW / and list the sitemap
curl.exe -s https://heramb.study/sitemap.xml
```

Then submit one real invite with your own email, check Firestore, and delete it with the admin CLI.

## Domain & trademark note
"Heramb.study" is a proposed name. Before public launch, confirm domain ownership, run a trademark search (India: IP India public search, classes 9, 41, 42; plus WIPO Global Brand Database for international markets) and check social handles.

## Future payments (Razorpay / PayPal)

Disabled (`RAZORPAY_ENABLED=false`, `PAYPAL_ENABLED=false`) and unimplemented. The adapter boundary is in `src/config/payments.ts`. Before enabling:
1. Server-side order creation with server-computed prices.
2. Webhook signature verification (Razorpay HMAC-SHA256; PayPal Verify Webhook Signature API) on a raw-body route.
3. Idempotency keys for orders and webhook events (store processed event IDs).
4. Reconciliation job comparing provider records with subscription state.
5. Refund flow matching a published refund policy (replace the current `/refund-policy` page first).
6. Subscription state machine and GST invoices for Indian customers.
7. Load payment SDKs only on the checkout route; update CSP for the provider origins.
Never treat a client-side success redirect as proof of payment, and never use checkout URLs you haven't verified you own.
