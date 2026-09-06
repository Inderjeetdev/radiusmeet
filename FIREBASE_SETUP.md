# Firebase setup for RadiusMeet (live user profiles)

Free **Spark** plan is enough to start (Auth + Firestore).

## 1. Create project

1. Go to https://console.firebase.google.com
2. Add project → name it (e.g. RadiusMeet)
3. Disable Google Analytics if you want (optional)

## 2. Enable Email/Password Auth

1. Build → Authentication → Get started
2. Sign-in method → Email/Password → Enable → Save

## 3. Create Firestore

1. Build → Firestore Database → Create database
2. Start in **test mode** for development (lock rules before production)
3. Choose a region close to your users

### Production rules (recommended)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 4. Register a Web app & copy config

1. Project settings (gear) → Your apps → Web (`</>`)
2. Register app nickname
3. Copy the `firebaseConfig` object

## 5. Paste config into the code

Open `src/lib/firebase.ts` and replace the `PASTE_*` values in `FIREBASE_CONFIG`,  
**or** create a `.env` file:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-id
VITE_FIREBASE_STORAGE_BUCKET=your-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 6. Install dependency

```bash
npm install firebase
```

(`firebase` is already listed in `package.json`.)

## 7. What works after this

| Feature | Behavior |
|--------|----------|
| Sign up / sign in | Firebase Auth + local mirror on phone |
| Setup profile | Saved on phone **and** to Firestore `profiles/{uid}` |
| Discover | **Live users** in same area first, then offline dummies |
| Without config | App still runs fully local (dummies only) |

## 8. Payments (separate)

Firebase does **not** process Play Store payments.  
For real money to your account use **Google Play Billing** in the Android build.

## Credits spent / earned (Firestore)

When profiles sync, fields include:

- `creditsSpent` / `creditsEarned` (update from the app when you wire live peers)
- `gender`, `phone`, `hobbies`, `smoke`, `drink`, `isAdmin`

Woman accounts accumulate **earnings** locally; at **1000 earnings ≈ $10** withdraw request (You screen). Real bank payout is manual until you connect a payout provider.

## Admin (free everything)

Set your email in `src/lib/admin.ts` → `ADMIN_EMAILS` (default includes `admin@radiusmeet.app`).

Sign up / setup with that email → profile gets `isAdmin`, unlimited credits, free chat/video/gifts/unlocks.
