# AdSense readiness checklist

**Status: advertising is DISABLED.** The site is not AdSense-approved and must not claim to be.

## The $2,500/month target, as arithmetic
Page RPM = earnings ÷ page views × 1,000. Required monthly page views = 2,500 ÷ RPM × 1,000:

| Page RPM | Page views / month |
|---|---|
| $2 | 1,250,000 |
| $5 | 500,000 |
| $10 | 250,000 |
| $20 | 125,000 |

These are scenarios, not forecasts. Indian traffic usually earns lower RPMs than US/UK traffic. Treat AdSense as a secondary revenue line; institute subscriptions are the primary path.

## Eligibility (Google AdSense Help, "Eligibility requirements", checked 12 Oct 2026)
- [ ] Applicant is 18+ (or a parent/guardian signs up).
- [ ] Content is your own, high-quality and original.
- [ ] You can edit the site's HTML (yes — `AdSlot` and the loader are in code).
- [ ] Site complies with AdSense Program policies (re-read them at application time; they change).

## Before applying
- [ ] Production domain live on HTTPS for a few weeks, indexed in Search Console.
- [ ] Substantial original public content (current: 5 resources + guides). Aim for 15–25 genuinely useful resources first.
- [ ] Privacy policy updated to describe advertising cookies, Google as a third-party vendor, and opt-out links.
- [ ] A **Google-certified CMP** integrated (required to serve ads in the EEA, UK and Switzerland). Current consent banner covers analytics only.
- [ ] `ads.txt` at `public/ads.txt` with your real publisher line (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
- [ ] Contact page and operator identity filled in.

## Enabling (after approval only)
```
NEXT_PUBLIC_ADSENSE_ENABLED=true
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-<your real ID>
NEXT_PUBLIC_ADSENSE_SLOT_RESOURCE=<real slot ID>
NEXT_PUBLIC_ADSENSE_AUTO_ADS_ENABLED=false
```
Rebuild — the CSP adds Google ad origins only when this is valid.

## Placement rules built into the code (`src/config/ads.ts`)
- Ads only on `/resources/<slug>` articles, below the content, labelled "Advertisement", with reserved height (no layout shift).
- Never on: home, invite, contact, legal pages, offline, or any future app/login/account route.
- Never next to buttons or inside tools, install prompts or forms.
- Not loaded until consent is granted. Auto ads remain off unless you review their placements.
- Never encourage clicks or refresh ads.
