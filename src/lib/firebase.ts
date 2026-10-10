/**
 * Firebase client for RadiusMeet (live profiles).
 *
 * After download:
 * 1. Create a project at https://console.firebase.google.com
 * 2. Enable Authentication → Email/Password
 * 3. Create Firestore database (start in test mode, then lock rules)
 * 4. Project settings → Your apps → Web app → copy config
 * 5. Paste values into the FIREBASE_CONFIG object below (or use env vars)
 *
 * Free Spark plan is enough for early users (Auth + Firestore quotas).
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  type Firestore,
} from "firebase/firestore";

/** Paste your Firebase web config here after download. */
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyC23YnjbWUvxQ2D2VT7NEfT83gdDschefY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "radiusmeet.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "radiusmeet",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "radiusmeet.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "501170180915",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:501170180915:web:d12f5d404072cbb165a446",
};

export function isFirebaseConfigured(): boolean {
  const k = FIREBASE_CONFIG.apiKey;
  return Boolean(k && !k.startsWith("PASTE_") && k.length > 10);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(FIREBASE_CONFIG);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!auth) auth = getAuth(a);
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!db) db = getFirestore(a);
  return db;
}

export type FirebaseProfile = {
  userId: string;
  email: string;
  displayName: string;
  age: number;
  gender: string;
  seeking: string;
  bio: string;
  photoData: string | null;
  area: string;
  lat: number | null;
  lng: number | null;
  searchRadiusKm: number;
  phone?: string;
  hobbies?: string[];
  smoke?: string;
  drink?: string;
  photosCount?: number;
  isAdmin?: boolean;
  creditsSpent?: number;
  creditsEarned?: number;
  updatedAt: number;
};

const PROFILES = "profiles";

export async function firebaseSignUp(email: string, password: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured yet.");
  const cred = await createUserWithEmailAndPassword(a, email.trim(), password);
  return cred.user;
}

export async function firebaseSignIn(email: string, password: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured yet.");
  const cred = await signInWithEmailAndPassword(a, email.trim(), password);
  return cred.user;
}

export async function firebaseSignOut() {
  const a = getFirebaseAuth();
  if (!a) return;
  await fbSignOut(a);
}

export function watchFirebaseUser(cb: (user: User | null) => void) {
  const a = getFirebaseAuth();
  if (!a) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(a, cb);
}

export function getFirebaseCurrentUser(): User | null {
  return getFirebaseAuth()?.currentUser ?? null;
}

export async function saveFirebaseProfile(
  profile: Omit<FirebaseProfile, "updatedAt">,
): Promise<void> {
  const firestore = getFirebaseDb();
  if (!firestore) return; // not configured — caller keeps local copy
  const ref = doc(firestore, PROFILES, profile.userId);
  await setDoc(
    ref,
    {
      ...profile,
      // Avoid huge base64 photos in free tier if very large
      photoData:
        profile.photoData && profile.photoData.length > 400_000
          ? null
          : profile.photoData,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function getFirebaseProfile(userId: string): Promise<FirebaseProfile | null> {
  const firestore = getFirebaseDb();
  if (!firestore) return null;
  const snap = await getDoc(doc(firestore, PROFILES, userId));
  if (!snap.exists()) return null;
  return snap.data() as FirebaseProfile;
}

/**
 * Load other users. Prefer same `area` (case-insensitive match done client-side).
 * Free tier: simple queries; we fetch a batch and filter in app.
 */
export async function listFirebaseProfilesNearby(opts: {
  myUserId: string;
  area: string;
  seeking: string;
  limitCount?: number;
}): Promise<FirebaseProfile[]> {
  const firestore = getFirebaseDb();
  if (!firestore) return [];

  const q = query(collection(firestore, PROFILES), limit(opts.limitCount ?? 80));
  const snap = await getDocs(q);
  const areaKey = opts.area.trim().toLowerCase();

  const rows: FirebaseProfile[] = [];
  snap.forEach((d) => {
    const p = d.data() as FirebaseProfile;
    if (!p?.userId || p.userId === opts.myUserId) return;
    if (areaKey) {
      const their = (p.area || "").trim().toLowerCase();
      if (!their) return;
      if (!(their === areaKey || their.includes(areaKey) || areaKey.includes(their))) return;
    }
    if (opts.seeking === "women" && p.gender !== "woman") return;
    if (opts.seeking === "men" && p.gender !== "man") return;
    rows.push(p);
  });
  return rows;
}

/** Suggested Firestore rules (paste in Firebase Console → Firestore → Rules) */
export const FIRESTORE_RULES_HINT = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
`.trim();