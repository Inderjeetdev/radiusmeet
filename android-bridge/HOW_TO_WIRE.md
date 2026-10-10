# Wire `window.RadiusMeetBilling` (Android)

The React Wallet code already uses:

```ts
window.RadiusMeetBilling.purchase(playProductId)
// → Promise<{ purchaseToken: string; productId: string }>
```

## Option A — Minimal Kotlin (Billing Library 7)

1. In `android/app/build.gradle` (app module) add:

```gradle
dependencies {
    implementation "com.android.billingclient:billing-ktx:7.1.1"
}
```

2. Copy `BillingBridge.kt` into  
   `android/app/src/main/java/<your/package>/BillingBridge.kt`  
   Adjust the `package` line to match your app.

3. In `MainActivity` (after WebView / Capacitor bridge is ready), call:

```kotlin
BillingBridge(this).attachToWebView(bridge.webView)
// or for Capacitor 6+:
// BillingBridge(this).attachCapacitor(this)
```

See `MainActivity-snippet.kt`.

4. Rebuild:

```bash
npx cap sync android
npx cap open android
# Run on a real device or emulator with Play Store
```

5. Wallet → buy pack → native Play sheet should open.  
   Success returns `source: "play"` and grants credits in the app.

## Option B — Capacitor community plugin

If you prefer a plugin (`cordova-plugin-purchase` / RevenueCat), still **adapt** their success callback to:

```js
window.RadiusMeetBilling = {
  purchase: async (productId) => {
    // your plugin purchase...
    return { purchaseToken: token, productId };
  },
};
```

Inject that script before the React app loads, or from native as in Option A.

## Consume purchases

Credit packs should be **consumed** so the user can buy again.  
`BillingBridge.kt` calls `consumeAsync` after a successful purchase.
