# Google Play Billing — collect payments for RadiusMeet

Digital credits on the Play Store **must** use **Google Play Billing** (not PayPal/Stripe inside the app for digital goods).

## How you get paid

1. User buys a credit pack in the app  
2. Google charges their Play payment method  
3. Google keeps its fee (see current Play fee schedule; often ~15% after thresholds)  
4. Rest is paid to **your** bank account linked in **Play Console → Payments profile**

## Products to create in Play Console

Monetize with Play → Products → In-app products → Create product  
Type: **Managed product** (one-time, consumable-style credits)

| Product ID (must match code) | Name | Suggested price |
|------------------------------|------|-----------------|
| `radiusmeet_credits_starter` | Starter (40 credits) | $4.99 |
| `radiusmeet_credits_plus` | Plus (120 credits) | $9.99 |
| `radiusmeet_credits_night` | Night (300 credits) | $19.99 |

These IDs are defined in `src/lib/billing.ts` → `CREDIT_PACKS`.

## App code already in place

- `src/lib/billing.ts` — catalog + `purchasePack()`
- Wallet UI calls `purchaseCredits()`
- **Sandbox** on web: grants credits, no real money  
- **Real Play**: when Android injects `window.RadiusMeetBilling.purchase(productId)`

### Android bridge (Capacitor / native)

In your Android shell, implement and expose:

```js
window.RadiusMeetBilling = {
  async purchase(productId) {
    // 1. Launch BillingClient purchase flow for productId
    // 2. On success, return { purchaseToken, productId }
    // 3. Optionally acknowledge/consume the purchase
  }
};
```

Libraries often used:

- [Google Play Billing Library](https://developer.android.com/google/play/billing) (Kotlin)
- Capacitor: `@capgo/native-purchases` or `cordova-plugin-purchase`

## Checklist before going live

1. Play Console developer account + payments profile (bank) verified  
2. App signed and uploaded (internal testing track is enough to test billing)  
3. Three in-app products created and **Active**  
4. License testers added (Settings → License testing) for free test purchases  
5. Android bridge wired to `window.RadiusMeetBilling`  
6. Do **not** offer alternative payment for the same digital credits in the Play build  

## What users buy

- Extra chat credits (1 credit / message after free texts)  
- Video session cost: 25 credits (see `VIDEO_COST`)  

Credits are stored on the device today (`localStorage`). For multi-device balance later, sync wallet to Firebase under the user id.
