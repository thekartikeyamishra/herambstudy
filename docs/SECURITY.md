# Security and privacy engineering

## Trust boundaries
1. **Browser → Next.js server** — everything from the browser is untrusted (body, headers, query, referrer).
2. **Next.js server → Firestore** — Admin SDK with a service account; the only path to data.
3. **Browser → Firestore** — closed. Rules deny every read and write.
4. **Owner machine → Firestore** — admin CLI with a key stored outside the repo.

## Controls implemented
| Area | Control | Where |
|---|---|---|
| Input validation | Zod schemas, unknown fields stripped, control characters rejected, length caps | `lib/validation/schemas.ts` |
| Trust | Status, consent records, timestamps and IDs are server-set; client values ignored | `lib/server/handlers.ts` |
| CSRF / cross-site | `Origin` must match host; JSON-only bodies | `lib/server/http.ts` |
| Abuse | Honeypot, min fill time, per-instance + shared Firestore rate limits (IP and email), salted hashes only | handlers, `firestoreBackend.ts` |
| Payload | 16 KB body limit, 415 for non-JSON | `http.ts` |
| Enumeration | Duplicate and new requests return identical responses | handlers |
| Data access | Firestore rules deny all client access | `firestore.rules` |
| Honesty | 503 when storage is unavailable or fails; never a fake success | handlers, `backend.ts` |
| Headers | CSP, HSTS (prod), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP; `X-Powered-By` removed | `next.config.ts`, `config/csp.ts` |
| Output | React escaping; JSON-LD serialiser escapes `<`, `>`, `&`; CSV exports neutralise formula injection | `lib/seo.ts`, `lib/tools/gaps.ts`, admin CLI |
| Secrets | Only `NEXT_PUBLIC_*` reaches the browser; Admin SDK imported only by server modules; `.env*` and key files git-ignored | `.gitignore` |
| Errors | Generic messages to users; logs contain no personal data | handlers, `error.tsx` |
| Email links | HMAC-SHA256 tokens bound to purpose + id, constant-time compare; consent changes need a POST (link scanners can't trigger them); RFC 8058 one-click unsubscribe; emails only for newly created requests | `lib/server/email.ts`, `handleEmailAction` |
| Email content | All user-supplied values HTML-escaped in templates | `escapeHtml` |
| Privacy | Analytics only after consent, allow-listed events, email-like params dropped; tools run fully client-side | `lib/client/analytics.ts` |

## Threat scenarios (v0.2 additions)
| Threat | Mitigation | Residual risk |
|---|---|---|
| Using the invite form to email a victim repeatedly | One email per address ever (created only), IP + email rate limits | A single unwanted acknowledgement per address |
| Forging a confirm/unsubscribe link | HMAC with a server secret; purpose-bound | Secret leak → rotate `EMAIL_TOKEN_SECRET` (old links stop working) |
| Pilot form spam | Honeypot, timing, IP + email limits | Add Turnstile if needed |

## Threat scenarios
| Threat | Mitigation | Residual risk |
|---|---|---|
| Bot floods the invite form | Honeypot, timing, IP + email limits | Distributed botnets across many IPs; add Turnstile/reCAPTCHA if observed |
| Attacker overwrites someone's request | Deterministic ID + `create()`; duplicates only increment a counter | — |
| Reading the waitlist | No read API; rules deny; Admin creds server-only | Compromise of the hosting account or service-account key |
| Cross-site form posting | Origin check, JSON content type | — |
| XSS | React escaping, no `dangerouslySetInnerHTML` except escaped JSON-LD, CSP | CSP allows `'unsafe-inline'` scripts (see below) |
| Clickjacking | `frame-ancestors 'none'`, XFO DENY | — |
| Leaked key in git | `.gitignore` patterns; secret scanning recommended | Human error — enable GitHub secret scanning + push protection |
| Rate-limit bypass via spoofed `X-Forwarded-For` | Host-aware IP extraction: first hop on Vercel; second-to-last on Google load balancers (`CLIENT_IP_MODE=gcp`, set in `apphosting.yaml`); per-email limit independent of IP | Other hosts: check how your proxy sets the header and adjust |

## Known trade-off: `'unsafe-inline'` in `script-src`
Next.js App Router injects inline bootstrap scripts. A nonce-based CSP would force every page to render dynamically (no static/CDN caching), hurting performance on low-end devices. Because there's no user-generated HTML and React escapes output, the risk is low. Revisit (nonces via middleware) when authenticated pages exist.

## Checklist before launch
- [ ] Rotate to a least-privilege service account (Cloud Datastore User only).
- [ ] `RATE_LIMIT_SALT` set to a random 32-byte value in production.
- [ ] Firestore rules deployed; run `npm run test:rules` locally.
- [ ] TTL policy on `rateLimits.expiresAt` active.
- [ ] GitHub secret scanning + Dependabot enabled.
- [ ] `npm audit --omit=dev` reviewed.
- [ ] 2FA on Google, GitHub, registrar and hosting accounts.
- [ ] Point-in-time recovery enabled.

## Dependency audit (12 Oct 2026)
See `docs/TEST-RESULTS.md` for the actual `npm audit` output from this build.

Passing tests are evidence of testing, not proof the application can't be attacked. No independent security audit has been performed.
