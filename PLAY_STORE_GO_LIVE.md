# RadiusMeet — Go live with Google Play Billing

You do **not** need a public listing to take real payments.
**Internal testing** is enough.

Money path:
User pays in app → Google charges card → Google fee → **your bank** in Play Console
(not PayPal for digital credits).

---

## Phase 0 — Accounts (one-time)

1. Create a [Google Play Developer](https://play.google.com/console) account (~$25 one-time).
2. Play Console → **Settings → Payments profile** → link **your bank account**.
   Wait until status is **verified** (can take a few days).
3. Optional: same Google account for Firebase (already set up).

---

## Phase 1 — Create the Android app entry

1. Play Console → **Create app**
   - Name: **RadiusMeet**
   - Default language: your choice
   - App or game: **App**
   - Free or paid: **Free** (credits are in-app products)
2. Complete **Store listing** drafts (can stay incomplete for internal testing).
3. Note your **applicationId** (package name), e.g. `app.radiusmeet.android`
   You will set the same ID in Capacitor / Android.

---

## Phase 2 — In-app products (must match code)

Play Console → your app → **Monetize with Play** → **Products** → **In-app products** → Create.

| Product ID (exact) | Name | Type | Price (example) |
|--------------------|------|------|-----------------|
| `radiusmeet_credits_starter` | Starter (40 credits) | Managed product | $4.99 |
| `radiusmeet_credits_plus` | Plus (120 credits) | Managed product | $9.99 |
| `radiusmeet_credits_night` | Night (300 credits) | Managed product | $19.99 |

- Status: **Active**
- These IDs are defined in `src/lib/billing.ts` → `CREDIT_PACKS[].playProductId`

---

## Phase 3 — License testers (free test purchases)

Play Console → **Settings → License testing**  
Add Gmail accounts that will test without real charges (or with test cards per Google’s current rules).

Also add those accounts as **Internal testers** on the internal testing track.

---

## Phase 4 — Capacitor Android shell (on your PC)

Requirements: Node.js, Android Studio, JDK 17.

In the RadiusMeet project folder:

```bash
npm install
npm run build

npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init RadiusMeet app.radiusmeet.android --web-dir dist
```

If `dist` is not your build output, check Vite/TanStack output folder (`dist` or `.output/public`) and set it in `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.radiusmeet.android',
  appName: 'RadiusMeet',
  webDir: 'dist',   // change if your build outputs elsewhere
  server: {
    androidScheme: 'https',
  },
};

export default config;
```

```bash
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio:
- Set `applicationId` / namespace to match Play Console (`app.radiusmeet.android`)
- Generate a **signed release** keystore (keep it safe)
- Build → Generate Signed Bundle / APK → **AAB**

---

## Phase 5 — Billing bridge

The web app already calls:

```js
window.RadiusMeetBilling.purchase(productId)
// must resolve { purchaseToken, productId }
```

See folder `android-bridge/`:
- `BillingBridge.kt` — injects the JS bridge from native
- `MainActivity-snippet.kt` — where to call it
- `HOW_TO_WIRE.md` — steps

Until this bridge exists, Wallet shows **sandbox** (no real money).

---

## Phase 6 — Upload internal testing

1. Play Console → **Testing → Internal testing** → Create release  
2. Upload the **AAB**  
3. Add testers (email list)  
4. Testers open the opt-in link, install from Play Store  
5. On device, open Wallet → buy a pack → should say **Google Play** (not sandbox)

---

## Phase 7 — Confirm money

- Test with **license tester** accounts first  
- Play Console → **Monetize → Financial reports** / **Earnings**  
- Payouts go to the **bank** on your payments profile (not PayPal)

---

## Checklist

- [ ] Play developer account + bank verified  
- [ ] App created in Console (`applicationId` fixed)  
- [ ] 3 products Active with exact IDs  
- [ ] License testers + internal testers  
- [ ] Capacitor Android project builds signed AAB  
- [ ] `window.RadiusMeetBilling` wired and tested on device  
- [ ] Internal testing release live; real Play purchase sheet appears  

---

## Common issues

| Problem | Fix |
|---------|-----|
| Still “sandbox” | Bridge not injected; test on real APK from Play, not Chrome |
| Products not found | Product IDs mismatch; app not published to any track; wait a few hours after creating products |
| Purchase error | Use license tester account; app signed with upload key linked to Console |
| No payout | Payments profile incomplete; first payout needs minimum threshold |

---

## What you can skip for now

- Public production listing  
- Screenshots / feature graphic (needed later for production)  
- Firebase wallet sync (credits stay on device until you add it)
