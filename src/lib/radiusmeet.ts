import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export const PACKS = [
  { id: "starter", name: "Starter", credits: 40, cents: 499, blurb: "A handful of extra texts" },
  { id: "plus", name: "Plus", credits: 120, cents: 999, blurb: "Texts plus a video night" },
  { id: "night", name: "Night", credits: 300, cents: 1999, blurb: "For people who stay up talking" },
] as const;

export const VIDEO_COST = 25;
export const EXTRA_TEXT_COST = 1;

const genderZ = z.enum(["woman", "man", "nonbinary"]);
const seekingZ = z.enum(["women", "men", "everyone"]);

const RADIUS_OPTIONS = [20, 50, 100] as const;

/** Approximate distance in km (Haversine). */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeArea(area: string): string {
  return area.trim().toLowerCase().replace(/\s+/g, " ");
}

function areasMatch(a: string, b: string): boolean {
  const na = normalizeArea(a);
  const nb = normalizeArea(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}


/** Offline dummy profiles (no DB needed). Shown as people around the user's area. */
const DUMMY_PROFILES: Array<{
  id: string;
  display_name: string;
  age: number;
  gender: "woman" | "man" | "nonbinary";
  bio: string;
  hue: number;
  tagline: string;
}> = [
  { id: "d-01", display_name: "Aisha", age: 23, gender: "woman", bio: "Coffee, sketchbooks, and long evening walks.", hue: 18, tagline: "Quiet corners" },
  { id: "d-02", display_name: "Rohan", age: 27, gender: "man", bio: "Software by day, cricket on Sundays.", hue: 205, tagline: "Weekend pitch" },
  { id: "d-03", display_name: "Priya", age: 25, gender: "woman", bio: "Books, indie music, and street food hunts.", hue: 310, tagline: "Page turner" },
  { id: "d-04", display_name: "Arjun", age: 30, gender: "man", bio: "Gym, travel vlogs, terrible dad jokes.", hue: 45, tagline: "On the road" },
  { id: "d-05", display_name: "Meera", age: 22, gender: "woman", bio: "Design student. Plants on every windowsill.", hue: 140, tagline: "Green room" },
  { id: "d-06", display_name: "Kabir", age: 28, gender: "man", bio: "Barista who knows every playlist by heart.", hue: 25, tagline: "Late shift" },
  { id: "d-07", display_name: "Ananya", age: 26, gender: "woman", bio: "Yoga, chai, and slow mornings.", hue: 280, tagline: "Sunrise" },
  { id: "d-08", display_name: "Dev", age: 32, gender: "man", bio: "Photographer. Golden hour is non-negotiable.", hue: 35, tagline: "Lens ready" },
  { id: "d-09", display_name: "Sana", age: 24, gender: "woman", bio: "Law student. Debates and dessert.", hue: 330, tagline: "After class" },
  { id: "d-10", display_name: "Vikram", age: 29, gender: "man", bio: "Startup life. Looking for unhurried talks.", hue: 190, tagline: "Founder hours" },
  { id: "d-11", display_name: "Isha", age: 27, gender: "woman", bio: "Nurse. Soft playlists and long walks.", hue: 12, tagline: "Off duty" },
  { id: "d-12", display_name: "Nikhil", age: 25, gender: "man", bio: "Football, anime, and late-night drives.", hue: 160, tagline: "Match day" },
  { id: "d-13", display_name: "Tara", age: 23, gender: "woman", bio: "Writer. Cafés with good windows.", hue: 300, tagline: "First draft" },
  { id: "d-14", display_name: "Aditya", age: 31, gender: "man", bio: "Architect. Rooftops and city maps.", hue: 50, tagline: "Skyline" },
  { id: "d-15", display_name: "Zara", age: 26, gender: "woman", bio: "DJ on weekends. Quiet books on weekdays.", hue: 320, tagline: "After hours" },
  { id: "d-16", display_name: "Karan", age: 28, gender: "man", bio: "Chef. Still learning not to burn toast.", hue: 22, tagline: "Kitchen" },
  { id: "d-17", display_name: "Naina", age: 24, gender: "woman", bio: "Dance teacher. Always moving.", hue: 350, tagline: "Studio" },
  { id: "d-18", display_name: "Sameer", age: 33, gender: "man", bio: "Teacher. Board games and strong tea.", hue: 175, tagline: "Break time" },
  { id: "d-19", display_name: "Riya", age: 22, gender: "woman", bio: "Art school. Paint on my sleeves.", hue: 8, tagline: "Canvas" },
  { id: "d-20", display_name: "Harsh", age: 27, gender: "man", bio: "Cyclist. Sunrise rides preferred.", hue: 150, tagline: "Open roads" },
  { id: "d-21", display_name: "Pooja", age: 29, gender: "woman", bio: "Marketing by day, pottery by night.", hue: 290, tagline: "Clay hands" },
  { id: "d-22", display_name: "Yash", age: 24, gender: "man", bio: "Gamer and board-game host.", hue: 210, tagline: "Game night" },
  { id: "d-23", display_name: "Diya", age: 25, gender: "woman", bio: "Vet student. Dogs over drama.", hue: 100, tagline: "Soft paws" },
  { id: "d-24", display_name: "Aman", age: 30, gender: "man", bio: "Finance. Hiking every chance I get.", hue: 40, tagline: "Trail" },
  { id: "d-25", display_name: "Kriti", age: 23, gender: "woman", bio: "Singer. Open mics and rainy days.", hue: 340, tagline: "Stage light" },
  { id: "d-26", display_name: "Rahul", age: 26, gender: "man", bio: "Mechanic who restores old scooters.", hue: 55, tagline: "Garage" },
  { id: "d-27", display_name: "Sneha", age: 28, gender: "woman", bio: "Librarian. Quiet corners and tea.", hue: 265, tagline: "Stacks" },
  { id: "d-28", display_name: "Imran", age: 31, gender: "man", bio: "Pilot on leave. Stories from the sky.", hue: 195, tagline: "Above clouds" },
  { id: "d-29", display_name: "Lavanya", age: 24, gender: "woman", bio: "Fashion intern. Thrift stores first.", hue: 15, tagline: "Vintage" },
  { id: "d-30", display_name: "Siddharth", age: 29, gender: "man", bio: "Doctor. Soft voice, long shifts.", hue: 170, tagline: "Off call" },
  { id: "d-31", display_name: "Fatima", age: 27, gender: "woman", bio: "Baker. Sourdough and early alarms.", hue: 30, tagline: "Oven warm" },
  { id: "d-32", display_name: "Varun", age: 25, gender: "man", bio: "Journalist. Curious about everything.", hue: 220, tagline: "Byline" },
  { id: "d-33", display_name: "Aditi", age: 26, gender: "woman", bio: "UX designer. Empathy over ego.", hue: 125, tagline: "Wireframes" },
  { id: "d-34", display_name: "Mohit", age: 32, gender: "man", bio: "Farmer's market regular. Fresh produce.", hue: 70, tagline: "Market day" },
  { id: "d-35", display_name: "Neha", age: 23, gender: "woman", bio: "Podcaster. Always recording stories.", hue: 305, tagline: "Mic on" },
  { id: "d-36", display_name: "Farhan", age: 28, gender: "man", bio: "Guitar on balconies after work.", hue: 240, tagline: "Strings" },
  { id: "d-37", display_name: "Shruti", age: 30, gender: "woman", bio: "Therapist. Listening is my craft.", hue: 275, tagline: "Quiet room" },
  { id: "d-38", display_name: "Raj", age: 27, gender: "man", bio: "Electrician. Fixing things, building trust.", hue: 60, tagline: "Toolkit" },
  { id: "d-39", display_name: "Maya", age: 25, gender: "nonbinary", bio: "Illustrator. Soft colors, bold lines.", hue: 335, tagline: "Sketchbook" },
  { id: "d-40", display_name: "Omar", age: 29, gender: "man", bio: "Translator. Languages and long dinners.", hue: 185, tagline: "Table talk" },
  { id: "d-41", display_name: "Gauri", age: 24, gender: "woman", bio: "Marine biologist on land this month.", hue: 155, tagline: "Tide charts" },
  { id: "d-42", display_name: "Tejas", age: 26, gender: "man", bio: "Runner. 5K before breakfast.", hue: 145, tagline: "Pace" },
  { id: "d-43", display_name: "Hina", age: 22, gender: "woman", bio: "College. Debate club and ice cream.", hue: 320, tagline: "Campus" },
  { id: "d-44", display_name: "Arnav", age: 34, gender: "man", bio: "Ex-army. Calm under pressure.", hue: 90, tagline: "Steady" },
  { id: "d-45", display_name: "Simran", age: 28, gender: "woman", bio: "Event planner. Chaos with a smile.", hue: 5, tagline: "Guest list" },
  { id: "d-46", display_name: "Jatin", age: 25, gender: "man", bio: "Street photographer. Faces and light.", hue: 48, tagline: "Click" },
  { id: "d-47", display_name: "Aarohi", age: 27, gender: "woman", bio: "Classical dancer. Rhythm over rush.", hue: 355, tagline: "Footwork" },
  { id: "d-48", display_name: "Rehan", age: 30, gender: "man", bio: "Cafe owner. Tables and conversations.", hue: 20, tagline: "Corner table" },
  { id: "d-49", display_name: "Malini", age: 26, gender: "woman", bio: "Researcher. Labs and late notes.", hue: 285, tagline: "Lab coat" },
  { id: "d-50", display_name: "Samar", age: 23, gender: "man", bio: "Film student. Short films, long nights.", hue: 230, tagline: "Cut" },
  { id: "d-51", display_name: "Ira", age: 29, gender: "woman", bio: "Florist. Petals and patience.", hue: 10, tagline: "Bloom" },
  { id: "d-52", display_name: "Kunal", age: 31, gender: "man", bio: "Coach. Early drills, honest feedback.", hue: 165, tagline: "Whistle" },
  { id: "d-53", display_name: "Bhavya", age: 24, gender: "woman", bio: "Animator. Frames between frames.", hue: 315, tagline: "Timeline" },
  { id: "d-54", display_name: "Naveen", age: 28, gender: "man", bio: "Driver-turned-guide. City secrets.", hue: 80, tagline: "Side streets" },
  { id: "d-55", display_name: "Leela", age: 32, gender: "woman", bio: "Social worker. Quiet strength.", hue: 270, tagline: "Field notes" },
  { id: "d-56", display_name: "Ashwin", age: 26, gender: "nonbinary", bio: "Poet. Lines that land softly.", hue: 295, tagline: "Verse" },
];

function id() {
  return crypto.randomUUID();
}

async function ensureWallet(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  await sql`
    insert into wallets (user_id, credits, free_texts)
    values (${userId}, 0, 8)
    on conflict (user_id) do nothing
  `;
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureWallet(sql, context.userId);
    const [profile] = await sql<{
      user_id: string;
      display_name: string;
      age: number;
      gender: string;
      seeking: string;
      bio: string;
      photo_data: string | null;
      area: string;
      lat: number | null;
      lng: number | null;
      search_radius_km: number;
    }>`select user_id, display_name, age, gender, seeking, bio, photo_data, area, lat, lng, search_radius_km from profiles where user_id = ${context.userId}`;
    const [wallet] = await sql<{ credits: number; free_texts: number }>`
      select credits, free_texts from wallets where user_id = ${context.userId}
    `;
    return { profile: profile ?? null, wallet: wallet ?? { credits: 0, free_texts: 8 } };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().min(2).max(32),
      age: z.number().int().min(18).max(99),
      gender: genderZ,
      seeking: seekingZ,
      bio: z.string().max(280),
      photoData: z.string().max(900_000).nullable(),
      area: z.string().min(2).max(80),
      lat: z.number().min(-90).max(90).nullable(),
      lng: z.number().min(-180).max(180).nullable(),
      searchRadiusKm: z.number().int().refine((n) => [20, 50, 100].includes(n)),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureWallet(sql, context.userId);
    const area = data.area.trim();
    await sql`
      insert into profiles (user_id, display_name, age, gender, seeking, bio, photo_data, area, lat, lng, search_radius_km)
      values (${context.userId}, ${data.displayName}, ${data.age}, ${data.gender}, ${data.seeking}, ${data.bio}, ${data.photoData}, ${area}, ${data.lat}, ${data.lng}, ${data.searchRadiusKm})
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        age = excluded.age,
        gender = excluded.gender,
        seeking = excluded.seeking,
        bio = excluded.bio,
        photo_data = excluded.photo_data,
        area = excluded.area,
        lat = excluded.lat,
        lng = excluded.lng,
        search_radius_km = excluded.search_radius_km
    `;
    return { ok: true as const };
  });

export const listDiscover = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const [me] = await sql<{
      seeking: string;
      gender: string;
      area: string;
      lat: number | null;
      lng: number | null;
      search_radius_km: number;
    }>`
      select seeking, gender, area, lat, lng, search_radius_km from profiles where user_id = ${context.userId}
    `;
    if (!me) return { people: [] as const, area: "", radiusKm: 50 };

    const radiusKm = me.search_radius_km || 50;
    const myArea = me.area || "";

    // Offline dummies come from code (no migration required)
    const samples = DUMMY_PROFILES;

    const others = await sql<{
      user_id: string;
      display_name: string;
      age: number;
      gender: string;
      bio: string;
      photo_data: string | null;
      area: string;
      lat: number | null;
      lng: number | null;
    }>`select user_id, display_name, age, gender, bio, photo_data, area, lat, lng from profiles where user_id <> ${context.userId}`;

    function genderMatches(gender: string) {
      if (me.seeking === "everyone") return true;
      if (me.seeking === "women") return gender === "woman";
      if (me.seeking === "men") return gender === "man";
      return true;
    }

    function inRange(
      theirArea: string,
      theirLat: number | null,
      theirLng: number | null,
    ): { ok: boolean; distanceKm: number | null; label: string } {
      // Prefer precise coords when both sides have them
      if (
        me.lat != null &&
        me.lng != null &&
        theirLat != null &&
        theirLng != null
      ) {
        const d = distanceKm(me.lat, me.lng, theirLat, theirLng);
        return {
          ok: d <= radiusKm,
          distanceKm: Math.round(d * 10) / 10,
          label: d < 1 ? "Under 1 km" : `${Math.round(d)} km away`,
        };
      }
      // Same city / area name (user can only search around their address)
      if (myArea.trim() && areasMatch(myArea, theirArea)) {
        return { ok: true, distanceKm: null, label: theirArea || "Same area" };
      }
      return { ok: false, distanceKm: null, label: "" };
    }

    // Real signed-in members in the user's area — always on top
    const realPeople = others
      .filter((p) => genderMatches(p.gender))
      .map((p) => {
        const range = inRange(p.area, p.lat, p.lng);
        if (!range.ok) return null;
        return {
          id: p.user_id,
          kind: "user" as const,
          online: true as const,
          name: p.display_name,
          age: p.age,
          gender: p.gender,
          bio: p.bio,
          hue: 0,
          tagline: "On RadiusMeet",
          photo: p.photo_data,
          area: p.area || myArea,
          distanceLabel: range.label,
          distanceKm: range.distanceKm,
        };
      })
      .filter(Boolean);

    // Offline dummies: show ~20 random people "around" the user's area
    // so the feed never feels empty and gives hope of activity nearby.
    const offlinePool = samples.filter((s) => genderMatches(s.gender));
    // Deterministic shuffle keyed by user area so the same area gets a stable set
    const seed = normalizeArea(myArea)
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const shuffled = [...offlinePool].sort((a, b) => {
      const ha = (a.id.charCodeAt(2) * 17 + seed) % 997;
      const hb = (b.id.charCodeAt(2) * 17 + seed) % 997;
      return ha - hb;
    });
    const OFFLINE_LIMIT = 20;
    const samplePeople = shuffled.slice(0, OFFLINE_LIMIT).map((s, idx) => {
      // Fake a plausible distance inside the user's radius for offline cards
      const fakeKm =
        radiusKm <= 20
          ? 1 + (idx % 12)
          : radiusKm <= 50
            ? 2 + ((idx * 3) % 40)
            : 5 + ((idx * 5) % 80);
      const capped = Math.min(fakeKm, radiusKm - 1);
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
        area: myArea || s.area,
        distanceLabel: capped < 1 ? "Under 1 km" : `About ${capped} km away`,
        distanceKm: capped,
      };
    });

    // Real online members first, then offline dummies; within each group by distance
    const byDistance = <T extends { distanceKm: number | null }>(a: T, b: T) => {
      const da = a.distanceKm;
      const db = b.distanceKm;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    };

    realPeople.sort(byDistance);
    samplePeople.sort(byDistance);

    const people = [...realPeople, ...samplePeople];

    return {
      people: people as NonNullable<(typeof people)[number]>[],
      area: myArea,
      radiusKm,
      onlineCount: realPeople.length,
      offlineCount: samplePeople.length,
    };
  });

export const listInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      peer_id: string;
      peer_kind: string;
      last_body: string;
      last_at: string;
    }>`select id, peer_id, peer_kind, last_body, last_at from conversations where user_id = ${context.userId} order by last_at desc`;
    return { conversations: rows };
  });

export const openChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ peerId: z.string(), peerKind: z.enum(["sample", "user"]) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from conversations
      where user_id = ${context.userId} and peer_id = ${data.peerId} and peer_kind = ${data.peerKind}
    `;
    if (existing[0]) return { conversationId: existing[0].id };
    const conversationId = id();
    await sql`
      insert into conversations (id, user_id, peer_id, peer_kind)
      values (${conversationId}, ${context.userId}, ${data.peerId}, ${data.peerKind})
    `;
    return { conversationId };
  });

export const getChat = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const [conv] = await sql<{
      id: string;
      peer_id: string;
      peer_kind: string;
    }>`select id, peer_id, peer_kind from conversations where id = ${data.conversationId} and user_id = ${context.userId}`;
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

    if (conv.peer_kind === "sample") {
      const s = DUMMY_PROFILES.find((d) => d.id === conv.peer_id);
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
      const [p] = await sql<{
        display_name: string;
        age: number;
        gender: string;
        bio: string;
        photo_data: string | null;
      }>`select display_name, age, gender, bio, photo_data from profiles where user_id = ${conv.peer_id}`;
      if (!p) return null;
      peer = {
        name: p.display_name,
        age: p.age,
        gender: p.gender,
        bio: p.bio,
        hue: 0,
        photo: p.photo_data,
        sample: false,
      };
    }

    const messages = await sql<{ id: number; sender: string; body: string; created_at: string }>`
      select id, sender, body, created_at from messages where conversation_id = ${conv.id} order by id asc
    `;
    const [wallet] = await sql<{ credits: number; free_texts: number }>`
      select credits, free_texts from wallets where user_id = ${context.userId}
    `;
    return { conversationId: conv.id, peerId: conv.peer_id, peerKind: conv.peer_kind, peer, messages, wallet };
  });

const REPLIES = [
  "Hey — glad you wrote. How's your week looking?",
  "Hi. I only exist in this preview, but I can keep a conversation going.",
  "That's a nice opener. What do you usually do after work?",
  "I'm a sample profile, so I reply instantly. Tell me something true anyway.",
];

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ conversationId: z.string(), body: z.string().min(1).max(500) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const [conv] = await sql<{ id: string; peer_kind: string }>`
      select id, peer_kind from conversations where id = ${data.conversationId} and user_id = ${context.userId}
    `;
    if (!conv) throw new Error("Chat not found");

    await ensureWallet(sql, context.userId);
    const [wallet] = await sql<{ credits: number; free_texts: number }>`
      select credits, free_texts from wallets where user_id = ${context.userId}
    `;
    if (!wallet) throw new Error("Wallet missing");

    if (wallet.free_texts > 0) {
      await sql`update wallets set free_texts = free_texts - 1 where user_id = ${context.userId}`;
    } else if (wallet.credits >= EXTRA_TEXT_COST) {
      await sql`update wallets set credits = credits - ${EXTRA_TEXT_COST} where user_id = ${context.userId}`;
    } else {
      return { ok: false as const, reason: "paywall" as const };
    }

    const body = data.body.trim();
    await sql`
      insert into messages (conversation_id, sender, body) values (${conv.id}, 'me', ${body})
    `;
    await sql`update conversations set last_body = ${body}, last_at = now() where id = ${conv.id}`;

    if (conv.peer_kind === "sample") {
      const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)]!;
      await sql`
        insert into messages (conversation_id, sender, body) values (${conv.id}, 'peer', ${reply})
      `;
      await sql`update conversations set last_body = ${reply}, last_at = now() where id = ${conv.id}`;
    }

    return { ok: true as const };
  });

export const startVideo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const [conv] = await sql<{ id: string }>`
      select id from conversations where id = ${data.conversationId} and user_id = ${context.userId}
    `;
    if (!conv) throw new Error("Chat not found");
    await ensureWallet(sql, context.userId);
    const [wallet] = await sql<{ credits: number }>`select credits from wallets where user_id = ${context.userId}`;
    if (!wallet || wallet.credits < VIDEO_COST) {
      return { ok: false as const, reason: "paywall" as const, credits: wallet?.credits ?? 0 };
    }
    await sql`update wallets set credits = credits - ${VIDEO_COST} where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const mockPaypalPurchase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ packId: z.enum(["starter", "plus", "night"]) }))
  .handler(async ({ context, data }) => {
    const pack = PACKS.find((p) => p.id === data.packId);
    if (!pack) throw new Error("Unknown pack");
    const sql = await getSql();
    await ensureWallet(sql, context.userId);
    await sql`update wallets set credits = credits + ${pack.credits} where user_id = ${context.userId}`;
    await sql`
      insert into purchases (user_id, pack_id, credits, amount_cents)
      values (${context.userId}, ${pack.id}, ${pack.credits}, ${pack.cents})
    `;
    const [wallet] = await sql<{ credits: number; free_texts: number }>`
      select credits, free_texts from wallets where user_id = ${context.userId}
    `;
    return { ok: true as const, wallet };
  });
