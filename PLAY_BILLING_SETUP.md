# Google Play Billing — RadiusMeet

**Full step-by-step:** see **[PLAY_STORE_GO_LIVE.md](./PLAY_STORE_GO_LIVE.md)**  
**Android code:** see **[android-bridge/](./android-bridge/)**

## Product IDs (must match Play Console)

| Product ID | Pack | Credits |
|------------|------|---------|
| `radiusmeet_credits_starter` | Starter | 40 |
| `radiusmeet_credits_plus` | Plus | 120 |
| `radiusmeet_credits_night` | Night | 300 |

Defined in `src/lib/billing.ts`.

## Money

- Digital credits → **Google Play Billing only** on Android  
- You are paid via **Play Console → bank account** (not PayPal)  
- Web / localhost → **sandbox** (free test credits)

## Bridge contract

```js
window.RadiusMeetBilling.purchase(productId)
  .then(({ purchaseToken, productId }) => { /* app grants credits */ })
```

When this object exists, Wallet shows real Play purchase (not sandbox).
