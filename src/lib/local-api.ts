/**
 * Client API for routes.
 * - Always keeps a local copy on the phone (works offline / before Firebase is hooked up).
 * - When Firebase config is filled in, also syncs profiles and loads live users.
 */
import {
  addCredits,
  addEarnings,
  appendMessage,
  createWithdrawRequest,
  getConversation,
  getEligibleEarnings,
  getMessages,
  getProfile,
  getSessionUserId,
  getWallet,
  listConversations,
  listSupportMessages,
  listUserStats,
  listWithdrawRequests,
  localSignIn,
  localSignOut,
  localSignUp,
  markSupportReadByAdmin,
  openLocalChat,
  saveLocalProfile,
  sendSupportMessage,
  setWithdrawStatus,
  spendCredits,
  spendForSendText,
  unlockMessage,
  type Gender,
  type Seeking,
} from "@/lib/local-store";
import { ECONOMY, GIFT_PRESETS } from "@/lib/economy";
import { isAdminEmail, isAdminPhone } from "@/lib/admin";
import { CREDIT_PACKS, purchasePack, type PackId } from "@/lib/billing";
import {
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignUp,
  getFirebaseCurrentUser,
  isFirebaseConfigured,
  listFirebaseProfilesNearby,
  saveFirebaseProfile,
} from "@/lib/firebase";


/** Create account: local always; Firebase when configured. */
export async function signUp(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isFirebaseConfigured()) {
    try {
      const user = await firebaseSignUp(email, password);
      // Mirror session on device for offline-friendly profile/wallet
      const local = localSignUp(email, password);
      if (!local.ok) {
        // Account may already exist locally — force local session by sign-in
        const li = localSignIn(email, password);
        if (!li.ok) {
          // Create local slot tied to firebase uid
          const forced = localSignUp(`${user.uid}@firebase.local`, password);
          if (!forced.ok) return { ok: false, error: forced.error };
        }
      }
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign up failed";
      return { ok: false, error: msg };
    }
  }
  return localSignUp(email, password);
}

/** Sign in: Firebase when configured, else local-only. */
export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isFirebaseConfigured()) {
    try {
      await firebaseSignIn(email, password);
      const local = localSignIn(email, password);
      if (!local.ok) {
        // First time on this device after cloud signup
        localSignUp(email, password);
      }
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign in failed";
      return { ok: false, error: msg };
    }
  }
  return localSignIn(email, password);
}

export async function signOutAll() {
  localSignOut();
  if (isFirebaseConfigured()) {
    try {
      await firebaseSignOut();
    } catch {
      /* ignore */
    }
  }
}


export const PACKS = CREDIT_PACKS;

export const VIDEO_COST = 25;

/** Offline dummy profiles (code array — no server). */
export const DUMMY_PROFILES = [
  { id: "d-01", display_name: "Aisha", age: 23, gender: "woman" as const, bio: "Coffee, sketchbooks, and long evening walks.", hue: 18, tagline: "Quiet corners" },
  { id: "d-02", display_name: "Rohan", age: 27, gender: "man" as const, bio: "Software by day, cricket on Sundays.", hue: 205, tagline: "Weekend pitch" },
  { id: "d-03", display_name: "Priya", age: 25, gender: "woman" as const, bio: "Books, indie music, and street food hunts.", hue: 310, tagline: "Page turner" },
  { id: "d-04", display_name: "Arjun", age: 30, gender: "man" as const, bio: "Gym, travel vlogs, terrible dad jokes.", hue: 45, tagline: "On the road" },
  { id: "d-05", display_name: "Meera", age: 22, gender: "woman" as const, bio: "Design student. Plants on every windowsill.", hue: 140, tagline: "Green room" },
  { id: "d-06", display_name: "Kabir", age: 28, gender: "man" as const, bio: "Barista who knows every playlist by heart.", hue: 25, tagline: "Late shift" },
  { id: "d-07", display_name: "Ananya", age: 26, gender: "woman" as const, bio: "Yoga, chai, and slow mornings.", hue: 280, tagline: "Sunrise" },
  { id: "d-08", display_name: "Dev", age: 32, gender: "man" as const, bio: "Photographer. Golden hour is non-negotiable.", hue: 35, tagline: "Lens ready" },
  { id: "d-09", display_name: "Sana", age: 24, gender: "woman" as const, bio: "Law student. Debates and dessert.", hue: 330, tagline: "After class" },
  { id: "d-10", display_name: "Vikram", age: 29, gender: "man" as const, bio: "Startup life. Looking for unhurried talks.", hue: 190, tagline: "Founder hours" },
  { id: "d-11", display_name: "Isha", age: 27, gender: "woman" as const, bio: "Nurse. Soft playlists and long walks.", hue: 12, tagline: "Off duty" },
  { id: "d-12", display_name: "Nikhil", age: 25, gender: "man" as const, bio: "Football, anime, and late-night drives.", hue: 160, tagline: "Match day" },
  { id: "d-13", display_name: "Tara", age: 23, gender: "woman" as const, bio: "Writer. Cafés with good windows.", hue: 300, tagline: "First draft" },
  { id: "d-14", display_name: "Aditya", age: 31, gender: "man" as const, bio: "Architect. Rooftops and city maps.", hue: 50, tagline: "Skyline" },
  { id: "d-15", display_name: "Zara", age: 26, gender: "woman" as const, bio: "DJ on weekends. Quiet books on weekdays.", hue: 320, tagline: "After hours" },
  { id: "d-16", display_name: "Karan", age: 28, gender: "man" as const, bio: "Chef. Still learning not to burn toast.", hue: 22, tagline: "Kitchen" },
  { id: "d-17", display_name: "Naina", age: 24, gender: "woman" as const, bio: "Dance teacher. Always moving.", hue: 350, tagline: "Studio" },
  { id: "d-18", display_name: "Sameer", age: 33, gender: "man" as const, bio: "Teacher. Board games and strong tea.", hue: 175, tagline: "Break time" },
  { id: "d-19", display_name: "Riya", age: 22, gender: "woman" as const, bio: "Art school. Paint on my sleeves.", hue: 8, tagline: "Canvas" },
  { id: "d-20", display_name: "Harsh", age: 27, gender: "man" as const, bio: "Cyclist. Sunrise rides preferred.", hue: 150, tagline: "Open roads" },
  { id: "d-21", display_name: "Pooja", age: 29, gender: "woman" as const, bio: "Marketing by day, pottery by night.", hue: 290, tagline: "Clay hands" },
  { id: "d-22", display_name: "Yash", age: 24, gender: "man" as const, bio: "Gamer and board-game host.", hue: 210, tagline: "Game night" },
  { id: "d-23", display_name: "Diya", age: 25, gender: "woman" as const, bio: "Vet student. Dogs over drama.", hue: 100, tagline: "Soft paws" },
  { id: "d-24", display_name: "Aman", age: 30, gender: "man" as const, bio: "Finance. Hiking every chance I get.", hue: 40, tagline: "Trail" },
  { id: "d-25", display_name: "Kriti", age: 23, gender: "woman" as const, bio: "Singer. Open mics and rainy days.", hue: 340, tagline: "Stage light" },
  { id: "d-26", display_name: "Rahul", age: 26, gender: "man" as const, bio: "Mechanic who restores old scooters.", hue: 55, tagline: "Garage" },
  { id: "d-27", display_name: "Sneha", age: 28, gender: "woman" as const, bio: "Librarian. Quiet corners and tea.", hue: 265, tagline: "Stacks" },
  { id: "d-28", display_name: "Imran", age: 31, gender: "man" as const, bio: "Pilot on leave. Stories from the sky.", hue: 195, tagline: "Above clouds" },
  { id: "d-29", display_name: "Lavanya", age: 24, gender: "woman" as const, bio: "Fashion intern. Thrift stores first.", hue: 15, tagline: "Vintage" },
  { id: "d-30", display_name: "Siddharth", age: 29, gender: "man" as const, bio: "Doctor. Soft voice, long shifts.", hue: 170, tagline: "Off call" },
  { id: "d-31", display_name: "Fatima", age: 27, gender: "woman" as const, bio: "Baker. Sourdough and early alarms.", hue: 30, tagline: "Oven warm" },
  { id: "d-32", display_name: "Varun", age: 25, gender: "man" as const, bio: "Journalist. Curious about everything.", hue: 220, tagline: "Byline" },
  { id: "d-33", display_name: "Aditi", age: 26, gender: "woman" as const, bio: "UX designer. Empathy over ego.", hue: 125, tagline: "Wireframes" },
  { id: "d-34", display_name: "Mohit", age: 32, gender: "man" as const, bio: "Farmer's market regular. Fresh produce.", hue: 70, tagline: "Market day" },
  { id: "d-35", display_name: "Neha", age: 23, gender: "woman" as const, bio: "Podcaster. Always recording stories.", hue: 305, tagline: "Mic on" },
  { id: "d-36", display_name: "Farhan", age: 28, gender: "man" as const, bio: "Guitar on balconies after work.", hue: 240, tagline: "Strings" },
  { id: "d-37", display_name: "Shruti", age: 30, gender: "woman" as const, bio: "Therapist. Listening is my craft.", hue: 275, tagline: "Quiet room" },
  { id: "d-38", display_name: "Raj", age: 27, gender: "man" as const, bio: "Electrician. Fixing things, building trust.", hue: 60, tagline: "Toolkit" },
  { id: "d-39", display_name: "Maya", age: 25, gender: "nonbinary" as const, bio: "Illustrator. Soft colors, bold lines.", hue: 335, tagline: "Sketchbook" },
  { id: "d-40", display_name: "Omar", age: 29, gender: "man" as const, bio: "Translator. Languages and long dinners.", hue: 185, tagline: "Table talk" },
  { id: "d-41", display_name: "Gauri", age: 24, gender: "woman" as const, bio: "Marine biologist on land this month.", hue: 155, tagline: "Tide charts" },
  { id: "d-42", display_name: "Tejas", age: 26, gender: "man" as const, bio: "Runner. 5K before breakfast.", hue: 145, tagline: "Pace" },
  { id: "d-43", display_name: "Hina", age: 22, gender: "woman" as const, bio: "College. Debate club and ice cream.", hue: 320, tagline: "Campus" },
  { id: "d-44", display_name: "Arnav", age: 34, gender: "man" as const, bio: "Ex-army. Calm under pressure.", hue: 90, tagline: "Steady" },
  { id: "d-45", display_name: "Simran", age: 28, gender: "woman" as const, bio: "Event planner. Chaos with a smile.", hue: 5, tagline: "Guest list" },
  { id: "d-46", display_name: "Jatin", age: 25, gender: "man" as const, bio: "Street photographer. Faces and light.", hue: 48, tagline: "Click" },
  { id: "d-47", display_name: "Aarohi", age: 27, gender: "woman" as const, bio: "Classical dancer. Rhythm over rush.", hue: 355, tagline: "Footwork" },
  { id: "d-48", display_name: "Rehan", age: 30, gender: "man" as const, bio: "Cafe owner. Tables and conversations.", hue: 20, tagline: "Corner table" },
  { id: "d-49", display_name: "Malini", age: 26, gender: "woman" as const, bio: "Researcher. Labs and late notes.", hue: 285, tagline: "Lab coat" },
  { id: "d-50", display_name: "Samar", age: 23, gender: "man" as const, bio: "Film student. Short films, long nights.", hue: 230, tagline: "Cut" },
  { id: "d-51", display_name: "Ira", age: 29, gender: "woman" as const, bio: "Florist. Petals and patience.", hue: 10, tagline: "Bloom" },
  { id: "d-52", display_name: "Kunal", age: 31, gender: "man" as const, bio: "Coach. Early drills, honest feedback.", hue: 165, tagline: "Whistle" },
  { id: "d-53", display_name: "Bhavya", age: 24, gender: "woman" as const, bio: "Animator. Frames between frames.", hue: 315, tagline: "Timeline" },
  { id: "d-54", display_name: "Naveen", age: 28, gender: "man" as const, bio: "Driver-turned-guide. City secrets.", hue: 80, tagline: "Side streets" },
  { id: "d-55", display_name: "Leela", age: 32, gender: "woman" as const, bio: "Social worker. Quiet strength.", hue: 270, tagline: "Field notes" },
  { id: "d-56", display_name: "Ashwin", age: 26, gender: "nonbinary" as const, bio: "Poet. Lines that land softly.", hue: 295, tagline: "Verse" },
];

const REPLIES = [
  "Hey — good to hear from someone nearby.",
  "I'm around this area too. How's your day?",
  "Nice to meet you. What brought you to RadiusMeet?",
  "Hello! Always up for a local chat.",
];

function normalizeArea(area: string) {
  return area.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getMe() {
  const profile = getProfile();
  const wallet = getWallet();
  if (!profile) {
    return {
      profile: null,
      wallet: {
        credits: wallet.credits,
        free_texts: wallet.freeTexts,
        has_plan: wallet.hasPlan,
        earnings: wallet.earnings,
        credits_spent: wallet.creditsSpent ?? 0,
        credits_purchased: wallet.creditsPurchased ?? 0,
        eligible_earnings: 0,
      },
    };
  }
  return {
    profile: {
      user_id: profile.userId,
      display_name: profile.displayName,
      age: profile.age,
      gender: profile.gender,
      seeking: profile.seeking,
      bio: profile.bio,
      photo_data: profile.photoData,
      photos: profile.photos ?? (profile.photoData ? [profile.photoData] : []),
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      hobbies: profile.hobbies ?? [],
      smoke: profile.smoke ?? "prefer_not",
      drink: profile.drink ?? "prefer_not",
      area: profile.area,
      lat: profile.lat,
      lng: profile.lng,
      search_radius_km: profile.searchRadiusKm,
      is_admin: Boolean(profile.isAdmin),
    },
    wallet: {
      credits: wallet.credits,
      free_texts: wallet.freeTexts,
      has_plan: wallet.hasPlan,
      earnings: wallet.earnings,
      credits_spent: wallet.creditsSpent ?? 0,
      credits_purchased: wallet.creditsPurchased ?? 0,
      eligible_earnings: getEligibleEarnings(profile.userId),
    },
  };
}

export async function saveProfile(args: {
  data: {
    displayName: string;
    age: number;
    gender: Gender;
    seeking: Seeking;
    bio: string;
    photoData: string | null;
    photos: string[];
    email: string;
    phone: string;
    hobbies: string[];
    smoke: "no" | "sometimes" | "yes" | "prefer_not";
    drink: "no" | "sometimes" | "yes" | "prefer_not";
    area: string;
    lat: number | null;
    lng: number | null;
    searchRadiusKm: number;
  };
}) {
  const d = args.data;
  if (!d.photos || d.photos.length < 3) {
    throw new Error("Add at least 3 photos.");
  }
  if (!d.email?.trim() || !d.phone?.trim()) {
    throw new Error("Email and phone number are required.");
  }
  const admin = isAdminEmail(d.email) || isAdminPhone(d.phone);
  const local = saveLocalProfile({
    displayName: d.displayName,
    age: d.age,
    gender: d.gender,
    seeking: d.seeking,
    bio: d.bio,
    photoData: d.photos[0] ?? null,
    photos: d.photos,
    email: d.email.trim(),
    phone: d.phone.trim(),
    hobbies: d.hobbies,
    smoke: d.smoke,
    drink: d.drink,
    area: d.area.trim(),
    lat: d.lat,
    lng: d.lng,
    searchRadiusKm: d.searchRadiusKm,
    isAdmin: admin,
  });

  if (isFirebaseConfigured()) {
    const fbUser = getFirebaseCurrentUser();
    const userId = fbUser?.uid ?? local.userId;
    try {
      await saveFirebaseProfile({
        userId,
        email: d.email.trim(),
        displayName: local.displayName,
        age: local.age,
        gender: local.gender,
        seeking: local.seeking,
        bio: local.bio,
        photoData: local.photoData,
        area: local.area,
        lat: local.lat,
        lng: local.lng,
        searchRadiusKm: local.searchRadiusKm,
        phone: local.phone,
        hobbies: local.hobbies,
        smoke: local.smoke,
        drink: local.drink,
        photosCount: local.photos.length,
        isAdmin: admin,
        creditsSpent: 0,
        creditsEarned: 0,
      } as any);
    } catch (err) {
      console.warn("Firebase profile sync failed (local profile still saved):", err);
    }
  }

  return { ok: true as const };
}

export async function listDiscover() {
  const me = getProfile();
  if (!me) return { people: [], area: "", radiusKm: 50, onlineCount: 0, offlineCount: 0 };

  const radiusKm = me.searchRadiusKm || 50;
  const myArea = me.area || "";

  function genderMatches(gender: string) {
    if (me.seeking === "everyone") return true;
    if (me.seeking === "women") return gender === "woman";
    if (me.seeking === "men") return gender === "man";
    return true;
  }

  // --- Live Firebase users (real people) on top ---
  let live: Array<{
    id: string;
    kind: "user";
    online: true;
    name: string;
    age: number;
    gender: string;
    bio: string;
    hue: number;
    tagline: string;
    photo: string | null;
    area: string;
    distanceLabel: string;
    distanceKm: number | null;
  }> = [];

  if (isFirebaseConfigured() && myArea) {
    try {
      const fbUser = getFirebaseCurrentUser();
      const rows = await listFirebaseProfilesNearby({
        myUserId: fbUser?.uid ?? me.userId,
        area: myArea,
        seeking: me.seeking,
        limitCount: 80,
      });
      live = rows.map((p) => ({
        id: p.userId,
        kind: "user" as const,
        online: true as const,
        name: p.displayName,
        age: p.age,
        gender: p.gender,
        bio: p.bio,
        hue: 0,
        tagline: "On RadiusMeet",
        photo: p.photoData,
        area: p.area || myArea,
        distanceLabel: p.area || "Same area",
        distanceKm: null as number | null,
      }));
    } catch (err) {
      console.warn("Firebase discover failed:", err);
    }
  }

  // --- Offline dummies (~20) so the feed is never empty ---
  const seed = normalizeArea(myArea)
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const pool = DUMMY_PROFILES.filter((s) => genderMatches(s.gender));
  const shuffled = [...pool].sort((a, b) => {
    const ha = (a.id.charCodeAt(2) * 17 + seed) % 997;
    const hb = (b.id.charCodeAt(2) * 17 + seed) % 997;
    return ha - hb;
  });

  const offlineCount = Math.min(20, shuffled.length);
  const offline = shuffled.slice(0, offlineCount).map((s, idx) => {
    const fakeKm =
      radiusKm <= 20 ? 1 + (idx % 12) : radiusKm <= 50 ? 2 + ((idx * 3) % 40) : 5 + ((idx * 5) % 80);
    const capped = Math.min(fakeKm, Math.max(1, radiusKm - 1));
    return {
      id: s.id,
      kind: "sample" as const,
      online: false as const,
      name: s.display_name,
      age: s.age,
      gender: s.gender,
      bio: s.bio,
      hue: s.hue,
      tagline: s.tagline,
      photo: null as string | null,
      area: myArea || "Nearby",
      distanceLabel: `About ${capped} km away`,
      distanceKm: capped as number | null,
    };
  });

  const people = [...live, ...offline];

  return {
    people,
    area: myArea,
    radiusKm,
    onlineCount: live.length,
    offlineCount: offline.length,
  };
}

export async function openChat(args: { data: { peerId: string; peerKind: "sample" | "user" } }) {
  const conversationId = openLocalChat(args.data.peerId, args.data.peerKind);
  return { conversationId };
}

export async function listInbox() {
  const wallet = getWallet();
  return {
    conversations: listConversations().map((c) => ({
      id: c.id,
      peer_id: c.peerId,
      peer_kind: c.peerKind,
      // Teaser only if user has no plan — classic coin-app pattern
      last_body: wallet.hasPlan
        ? c.lastBody
        : c.lastBody
          ? "New message — unlock to read"
          : "",
      last_at: c.lastAt,
      locked_preview: !wallet.hasPlan && Boolean(c.lastBody),
    })),
    wallet: {
      credits: wallet.credits,
      free_texts: wallet.freeTexts,
      has_plan: wallet.hasPlan,
      earnings: wallet.earnings,
      credits_spent: wallet.creditsSpent ?? 0,
      credits_purchased: wallet.creditsPurchased ?? 0,
      eligible_earnings: getEligibleEarnings(profile.userId),
    },
  };
}

export async function getChat(args: { data: { conversationId: string } }) {
  const conv = getConversation(args.data.conversationId);
  if (!conv) return null;

  let peer: {
    name: string;
    age: number;
    gender: string;
    bio: string;
    hue: number;
    photo: string | null;
    sample: boolean;
  };

  if (conv.peerKind === "sample") {
    const s = DUMMY_PROFILES.find((d) => d.id === conv.peerId);
    if (!s) return null;
    peer = {
      name: s.display_name,
      age: s.age,
      gender: s.gender,
      bio: s.bio,
      hue: s.hue,
      photo: null,
      sample: true,
    };
  } else {
    return null;
  }

  const wallet = getWallet();
  const messages = getMessages(conv.id).map((m) => {
    const locked = m.sender === "peer" && m.locked;
    return {
      id: m.id,
      sender: m.sender,
      kind: m.kind ?? "text",
      payload: m.payload,
      locked,
      // Hide body when locked
      body: locked
        ? m.kind === "gift"
          ? "🎁 Gift locked"
          : m.kind === "photo"
            ? "📷 Photo locked"
            : "Message locked — pay to read"
        : m.body,
      created_at: m.createdAt,
    };
  });

  return {
    conversationId: conv.id,
    peerId: conv.peerId,
    peerKind: conv.peerKind,
    peer,
    messages,
    wallet: {
      credits: wallet.credits,
      free_texts: wallet.freeTexts,
      has_plan: wallet.hasPlan,
      earnings: wallet.earnings,
    },
    costs: {
      unlockMessage: ECONOMY.unlockMessageCredits,
      unlockGift: ECONOMY.unlockGiftCredits,
      unlockPhoto: ECONOMY.unlockPhotoCredits,
      sendGift: ECONOMY.sendGiftCredits,
      sendMessage: ECONOMY.sendMessageCredits,
      videoPerMinute: ECONOMY.videoCreditsPerMinute,
      videoFreeSeconds: ECONOMY.videoFreeSeconds,
    },
  };
}

export async function sendMessage(args: { data: { conversationId: string; body: string } }) {
  const spend = spendForSendText();
  if (!spend.ok) return { ok: false as const, reason: "paywall" as const };

  appendMessage(args.data.conversationId, {
    sender: "me",
    body: args.data.body.trim(),
    kind: "text",
    locked: false,
  });

  const conv = getConversation(args.data.conversationId);
  if (conv?.peerKind === "sample") {
    const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)]!;
    appendMessage(args.data.conversationId, {
      sender: "peer",
      body: reply,
      kind: "text",
      locked: true,
    });
  }
  // Woman accounts earn when activity happens on their thread (notifications → credits)
  const me = getProfile();
  if (me?.gender === "woman" && !me.isAdmin) {
    addEarnings(ECONOMY.girlEarnOnMessageUnlock);
  }
  return { ok: true as const };
}

export async function sendGift(args: { data: { conversationId: string; giftId: string } }) {
  const gift = GIFT_PRESETS.find((g) => g.id === args.data.giftId);
  if (!gift) return { ok: false as const, reason: "error" as const, message: "Unknown gift" };
  const spent = spendCredits(ECONOMY.sendGiftCredits);
  if (!spent.ok) return { ok: false as const, reason: "paywall" as const };

  appendMessage(args.data.conversationId, {
    sender: "me",
    body: `${gift.emoji} ${gift.label}`,
    kind: "gift",
    payload: gift.id,
    locked: false,
  });

  // Sample peer auto-thanks with a locked gift back sometimes
  const conv = getConversation(args.data.conversationId);
  if (conv?.peerKind === "sample") {
    appendMessage(args.data.conversationId, {
      sender: "peer",
      body: "Thank you 💕",
      kind: "text",
      locked: true,
    });
  }
  return { ok: true as const };
}

export async function unlockChatMessage(args: { data: { messageId: number } }) {
  const res = unlockMessage(args.data.messageId);
  if (!res.ok) return { ok: false as const, reason: res.reason };
  return { ok: true as const };
}

/**
 * Start video: first 10s free conceptually; charge one minute upfront after that.
 * Creator share of spend is tracked as local "earnings" (for demo; real cash-out needs payout system).
 */
export async function startVideo(args: { data: { conversationId: string } }) {
  void args;
  const wallet = getWallet();
  if (!wallet.hasPlan) {
    return { ok: false as const, reason: "need_plan" as const, credits: wallet.credits };
  }
  // Charge first billable minute (after free 10s the app will call tickVideoMinute)
  const cost = ECONOMY.videoCreditsPerMinute;
  const spent = spendCredits(cost);
  if (!spent.ok) {
    return { ok: false as const, reason: "paywall" as const, credits: spent.wallet.credits };
  }
  const share = Math.floor(cost * ECONOMY.videoCreatorShare);
  // In a full multi-user system this would credit the peer; for demo we show share on wallet tip
  const me = getProfile();
  if (me?.gender === "woman" && !me.isAdmin) {
    addEarnings(share);
  }
  return {
    ok: true as const,
    freeSeconds: ECONOMY.videoFreeSeconds,
    creditsPerMinute: ECONOMY.videoCreditsPerMinute,
    creatorShareCredits: share,
  };
}

export async function tickVideoMinute() {
  const cost = ECONOMY.videoCreditsPerMinute;
  const spent = spendCredits(cost);
  if (!spent.ok) return { ok: false as const, reason: "paywall" as const, credits: spent.wallet.credits };
  const share = Math.floor(cost * ECONOMY.videoCreatorShare);
  return { ok: true as const, creatorShareCredits: share };
}

/** Purchase credits via Google Play Billing (native) or sandbox (web). */
export async function purchaseCredits(args: { data: { packId: PackId } }) {
  const result = await purchasePack(args.data.packId);
  if (!result.ok) {
    return {
      ok: false as const,
      reason: result.reason,
      message: result.message,
      wallet: null,
    };
  }
  const w = addCredits(result.creditsGranted);
  return {
    ok: true as const,
    source: result.source,
    purchaseToken: result.purchaseToken,
    wallet: {
      credits: w.credits,
      free_texts: w.freeTexts,
      has_plan: w.hasPlan,
      earnings: w.earnings,
    },
  };
}

/** @deprecated use purchaseCredits */
export async function mockPaypalPurchase(args: { data: { packId: PackId } }) {
  return purchaseCredits(args);
}

export { localSignIn, localSignUp, localSignOut, getSessionUserId };
export { isFirebaseConfigured } from "@/lib/firebase";


export async function requestWithdraw() {
  const res = createWithdrawRequest();
  if (!res.ok) return { ok: false as const, message: res.message };
  return {
    ok: true as const,
    message: `Withdraw request for $${res.request.amountUsd} sent to admin. We will contact ${res.request.phone || res.request.email}.`,
    amountUsd: res.request.amountUsd,
    requestId: res.request.id,
  };
}

export async function getAdminDashboard() {
  const me = getProfile();
  if (!me?.isAdmin) return { ok: false as const, message: "Admin only" };
  markSupportReadByAdmin();
  const users = listUserStats();
  const bySpend = [...users].sort((a, b) => b.creditsSpent - a.creditsSpent);
  const byEarn = [...users].sort((a, b) => b.earnings - a.earnings);
  return {
    ok: true as const,
    users: bySpend,
    topSpenders: bySpend.slice(0, 10),
    topEarners: byEarn.slice(0, 10),
    withdrawRequests: listWithdrawRequests(),
    supportMessages: listSupportMessages().filter((m) => !m.fromAdmin),
  };
}

export async function adminSetWithdraw(args: {
  data: { requestId: string; status: "paid" | "rejected" | "pending" };
}) {
  const me = getProfile();
  if (!me?.isAdmin) return { ok: false as const };
  setWithdrawStatus(args.data.requestId, args.data.status);
  return { ok: true as const };
}

export async function contactSupport(args: { data: { body: string } }) {
  if (!args.data.body.trim()) return { ok: false as const, message: "Write a message" };
  sendSupportMessage(args.data.body.trim());
  return { ok: true as const, message: "Message sent to support / admin." };
}

export async function adminReplySupport(args: { data: { body: string } }) {
  const me = getProfile();
  if (!me?.isAdmin) return { ok: false as const };
  sendSupportMessage(args.data.body.trim());
  return { ok: true as const };
}

