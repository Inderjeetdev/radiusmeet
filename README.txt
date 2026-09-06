RadiusMeet — Project reference
================================

App name: RadiusMeet
Theme: Find people near your area (km radius / same city), chat, gifts, video; freemium credits via Google Play Billing path.

------------------------------------------------------------------------------
IMPORTANT (device vs cloud)
------------------------------------------------------------------------------
On one phone you mainly see that device's users. With Firebase live profiles
later, the same admin tables can be filled from Firestore for all real users.

Admin login: sign up with an email listed in src/lib/admin.ts
(default admin@radiusmeet.app). Then complete setup with that same email so
the profile is flagged isAdmin.

------------------------------------------------------------------------------
WHOLE FUNCTIONALITY (as built)
------------------------------------------------------------------------------

1) Branding & packaging intent
   - Display name: RadiusMeet (not Vela).
   - Internal modules: local-store, local-api, billing, economy, firebase, admin.
   - Target: Android / Play Store style product; current code is a web app that
     can be wrapped (e.g. Capacitor) later for APK.

2) Accounts (phone-first)
   - Sign up / sign in with email + password stored on device (localStorage).
   - No required server for basic use.
   - If app is deleted / site data cleared, local profile and wallet are gone;
     user must create account again.
   - Optional Firebase Auth when keys are configured (src/lib/firebase.ts).

3) Profile setup (mandatory fields)
   - At least 3 photos (up to 6).
   - Name, age, gender, seeking.
   - Email and phone (required).
   - Hobbies (multi-select).
   - Smoke? / Drink? (no / sometimes / yes / prefer not).
   - City or area name + search radius (20 / 50 / 100 km).
   - Optional GPS for distance matching.
   - Bio.
   - Woman accounts: note about earning credits and withdraw.

4) Discover (nearby people)
   - Filtered by user's area / radius and gender preference.
   - Live Firebase users (when configured) appear first as "Online".
   - ~20 offline dummy profiles from code array (DUMMY_PROFILES) so the feed
     is never empty; labeled Nearby / offline.
   - Real multi-device users need Firebase (or similar) shared backend.

5) Chat economy (coin-style, similar to many chat apps)
   - Free user: inbox can show teaser only ("New message — unlock to read"),
     not full message body.
   - Buy any credit pack (Starter+) sets hasPlan → can unlock content.
   - Free texts on signup (few), then 1 credit per send.
   - Unlock text message: credits.
   - Send gift (heart / rose / star): credits.
   - Unlock gift / photo: credits.
   - Video: short free seconds, then credits per minute; creator share % to
     woman accounts as earnings (demo local balance).
   - Costs configured in src/lib/economy.ts.

6) Wallet & Google Play Billing plan
   - Packs: Starter / Plus / Night (product IDs in src/lib/billing.ts).
   - Web/preview: sandbox purchase (credits added, no real charge).
   - Android: inject window.RadiusMeetBilling.purchase(productId) for real
     Google Play Billing; money pays out via Play Console to your bank.
   - Do not use PayPal for digital credits on Play Store builds.
   - See PLAY_BILLING_SETUP.md.

7) Woman earnings & withdraw
   - Gender woman can accumulate earnings (activity / video share).
   - Eligible withdraw: 1000 credits earned within last ~6 months.
   - Request withdraw notifies admin (pending list with name, email, phone).
   - Admin marks Paid or Rejected.
   - Real bank payout is still a manual / external process until you connect
     a payout provider.

8) Support
   - User: You → Contact support → message to admin support inbox.
   - Admin sees support messages with contact details.

9) Admin
   - Emails in src/lib/admin.ts (default admin@radiusmeet.app).
   - Free chat, video, gifts, unlocks for admin.
   - Dashboard /admin:
       - Pending withdrawals
       - Support inbox
       - Top spenders / top earners tables
       - All users: spent, purchased, earned, 6-month eligible, balance
   - On a single device, stats are for profiles stored on that device store.
     With Firebase later, load all real users into the same tables from
     Firestore.

10) Firebase (prepared, not fully live until you add keys)
    - src/lib/firebase.ts: config placeholders, Auth, Firestore profiles.
    - When configured: sign up/in, profile sync, discover live users by area.
    - FIREBASE_SETUP.md: step-by-step.
    - Fields include phone, hobbies, smoke, drink, isAdmin, credits hooks.

11) Key source files
    - src/lib/local-store.ts     device data
    - src/lib/local-api.ts       app API used by routes
    - src/lib/economy.ts         prices & withdraw rules
    - src/lib/billing.ts         Play product IDs & purchasePack
    - src/lib/firebase.ts        Firebase client
    - src/lib/admin.ts           admin emails/phones
    - src/routes/setup.tsx       profile onboarding
    - src/routes/discover.tsx    nearby feed
    - src/routes/chats*.tsx      inbox & thread
    - src/routes/wallet.tsx      credits / packs
    - src/routes/me.tsx          profile, withdraw, support
    - src/routes/admin.tsx       admin dashboard
    - PLAY_BILLING_SETUP.md
    - FIREBASE_SETUP.md

12) After download
    npm install
    Fill Firebase keys if desired (src/lib/firebase.ts or VITE_FIREBASE_*).
    Set admin email in src/lib/admin.ts.
    For Play: create in-app products matching billing.ts product IDs.
    Wrap with Capacitor/native for real Play Billing bridge.

----
PENDING TASKS
----
- Firebase: paste real project config; enable Email/Password Auth + Firestore;
  production security rules; sync creditsSpent / creditsEarned for all users.
- Live multi-user discover and chat fully on Firebase (not only local + dummies).
- Admin dashboard: load global user stats and withdraw/support from Firestore
  (not only this device).
- Google Play Billing: Android/Capacitor bridge window.RadiusMeetBilling;
  real products active in Play Console; license tester purchases.
- Real payouts to women: bank/UPI process after admin approves withdraw
  (1000 credits / 6 months / $10 as designed).
- Free messaging for users when chatting specifically with admin (full
  peer-side enforcement when live users exist).
- Convert / wrap project to Play Store APK (Capacitor or native).
- Optional: push notifications for new messages, gifts, video, withdraw status.
- Optional: photo messages in chat with unlock pricing end-to-end.
- Optional: stronger password hashing / secure storage on device for production.
