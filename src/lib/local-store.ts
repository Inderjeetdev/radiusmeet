/**
 * Phone-only storage. Everything lives in localStorage on this device.
 * Delete the app / clear site data → profile is gone. No backend.
 */

import { ECONOMY, type MessageKind } from "@/lib/economy";

export type Gender = "woman" | "man" | "nonbinary";
export type Seeking = "women" | "men" | "everyone";

export type LocalProfile = {
  userId: string;
  displayName: string;
  age: number;
  gender: Gender;
  seeking: Seeking;
  bio: string;
  /** Legacy single photo; prefer photos[] */
  photoData: string | null;
  /** At least 3 required at setup */
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
  /** Set for admin accounts */
  isAdmin?: boolean;
};

export type LocalWallet = {
  credits: number;
  freeTexts: number;
  hasPlan: boolean;
  /** Lifetime earnings total (display) */
  earnings: number;
  /** Lifetime credits spent buying unlocks/gifts/video (not packs) */
  creditsSpent: number;
  /** Pack purchase total credits bought */
  creditsPurchased: number;
  /** One-time woman welcome pack already applied */
  womanBonusGranted?: boolean;
};

export type EarningsEntry = { amount: number; at: number; reason: string };

export type WithdrawRequest = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  phone: string;
  amountCredits: number;
  amountUsd: number;
  status: "pending" | "paid" | "rejected" | "credits_rewarded";
  createdAt: number;
  /** How admin fulfilled: cash outside app, or in-app credits */
  fulfillNote?: string;
};

export type SupportMessage = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  phone: string;
  body: string;
  fromAdmin: boolean;
  createdAt: number;
  readByAdmin: boolean;
};

export type LocalConversation = {
  id: string;
  peerId: string;
  peerKind: "sample" | "user";
  lastBody: string;
  lastAt: string;
};

export type LocalMessage = {
  id: number;
  conversationId: string;
  sender: "me" | "peer";
  body: string;
  createdAt: string;
  kind: MessageKind;
  /** Gift preset id or photo data-url */
  payload?: string;
  /** Incoming content locked until user pays to unlock */
  locked: boolean;
};

type Account = {
  userId: string;
  email: string;
  password: string;
};

type Store = {
  sessionUserId: string | null;
  accounts: Record<string, Account>;
  profiles: Record<string, LocalProfile>;
  wallets: Record<string, LocalWallet>;
  /** Per-user earnings with timestamps (6‑month window) */
  earningsLedger: Record<string, EarningsEntry[]>;
  withdrawRequests: WithdrawRequest[];
  supportMessages: SupportMessage[];
  /** email -> open|closed */
  supportTickets: Record<string, { status: "open" | "closed"; closedAt?: number }>;
  conversations: LocalConversation[];
  messages: LocalMessage[];
  messageSeq: number;
};

const KEY = "radiusmeet.local.v2";

function emptyWallet(): LocalWallet {
  return {
    credits: 0,
    freeTexts: ECONOMY.freeTextsOnSignup,
    hasPlan: false,
    earnings: 0,
    creditsSpent: 0,
    creditsPurchased: 0,
    womanBonusGranted: false,
  };
}

function emptyStore(): Store {
  return {
    sessionUserId: null,
    accounts: {},
    profiles: {},
    wallets: {},
    earningsLedger: {},
    withdrawRequests: [],
    supportMessages: [],
    supportTickets: {},
    conversations: [],
    messages: [],
    messageSeq: 1,
  };
}

function read(): Store {
  if (typeof localStorage === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = { ...emptyStore(), ...JSON.parse(raw) } as Store;
    return parsed;
  } catch {
    return emptyStore();
  }
}

function write(s: Store) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

function uid() {
  return crypto.randomUUID();
}

function ensureWallet(s: Store, userId: string): LocalWallet {
  if (!s.wallets[userId]) s.wallets[userId] = emptyWallet();
  const w = s.wallets[userId]!;
  if (typeof w.hasPlan !== "boolean") w.hasPlan = false;
  if (typeof w.earnings !== "number") w.earnings = 0;
  if (typeof w.creditsSpent !== "number") w.creditsSpent = 0;
  if (typeof w.creditsPurchased !== "number") w.creditsPurchased = 0;
  return w;
}

export function getSessionUserId(): string | null {
  return read().sessionUserId;
}

export function getSessionAccount(): Account | null {
  const s = read();
  if (!s.sessionUserId) return null;
  return Object.values(s.accounts).find((a) => a.userId === s.sessionUserId) ?? null;
}

export function localSignUp(email: string, password: string): { ok: true } | { ok: false; error: string } {
  const e = email.trim().toLowerCase();
  if (!e || password.length < 4) return { ok: false, error: "Email and password (min 4 chars) required." };
  const s = read();
  if (s.accounts[e]) return { ok: false, error: "Account already exists on this phone. Sign in instead." };
  const userId = uid();
  s.accounts[e] = { userId, email: e, password };
  s.wallets[userId] = emptyWallet();
  s.sessionUserId = userId;
  write(s);
  return { ok: true };
}

export function localSignIn(email: string, password: string): { ok: true } | { ok: false; error: string } {
  const e = email.trim().toLowerCase();
  const s = read();
  const acc = s.accounts[e];
  if (!acc || acc.password !== password) return { ok: false, error: "Wrong email or password on this device." };
  s.sessionUserId = acc.userId;
  write(s);
  return { ok: true };
}

export function localSignOut() {
  const s = read();
  s.sessionUserId = null;
  write(s);
}

export function getProfile(userId?: string): LocalProfile | null {
  const s = read();
  const id = userId ?? s.sessionUserId;
  if (!id) return null;
  return s.profiles[id] ?? null;
}

/** Other completed profiles on this device (for same-browser multi-account testing). */
export function listOtherLocalProfiles(): LocalProfile[] {
  const s = read();
  const me = s.sessionUserId;
  return Object.values(s.profiles).filter((p) => p.userId !== me && p.displayName);
}

export function saveLocalProfile(
  data: Omit<LocalProfile, "userId"> & { userId?: string },
): LocalProfile {
  const s = read();
  const userId = data.userId ?? s.sessionUserId;
  if (!userId) throw new Error("Not signed in");
  const photos = (data.photos ?? []).filter(Boolean);
  const profile: LocalProfile = {
    userId,
    displayName: data.displayName,
    age: data.age,
    gender: data.gender,
    seeking: data.seeking,
    bio: data.bio,
    photoData: photos[0] ?? data.photoData ?? null,
    photos,
    email: data.email,
    phone: data.phone,
    hobbies: data.hobbies ?? [],
    smoke: data.smoke,
    drink: data.drink,
    area: data.area,
    lat: data.lat,
    lng: data.lng,
    searchRadiusKm: data.searchRadiusKm,
    isAdmin: data.isAdmin,
  };
  s.profiles[userId] = profile;
  const w = ensureWallet(s, userId);
  if (profile.isAdmin) {
    w.hasPlan = true;
    w.credits = Math.max(w.credits, 99999);
    w.freeTexts = 9999;
  } else if (profile.gender === "woman" && !w.womanBonusGranted) {
    // Creator-side welcome pack (common freemium pattern)
    w.credits += ECONOMY.womanWelcomeCredits;
    w.womanBonusGranted = true;
  }
  s.wallets[userId] = w;
  write(s);
  return profile;
}

export function getWallet(userId?: string): LocalWallet {
  const s = read();
  const id = userId ?? s.sessionUserId;
  if (!id) return emptyWallet();
  return { ...emptyWallet(), ...ensureWallet(s, id) };
}

export function addCredits(packCredits: number) {
  const s = read();
  const id = s.sessionUserId;
  if (!id) throw new Error("Not signed in");
  const w = ensureWallet(s, id);
  w.credits += packCredits;
  w.creditsPurchased = (w.creditsPurchased || 0) + packCredits;
  if (packCredits > 0) w.hasPlan = true;
  s.wallets[id] = w;
  write(s);
  return w;
}

/** Admin: add credits to any account on this device by email (or current user). */
export function adminGrantCreditsToEmail(
  email: string,
  amount: number,
): { ok: true; userId: string; credits: number } | { ok: false; message: string } {
  if (!amount || amount === 0) return { ok: false, message: "Enter a non-zero amount" };
  const s = read();
  const e = email.trim().toLowerCase();
  let userId: string | null = null;
  for (const p of Object.values(s.profiles)) {
    if ((p.email || "").toLowerCase() === e) {
      userId = p.userId;
      break;
    }
  }
  if (!userId) {
    for (const a of Object.values(s.accounts)) {
      if (a.email.toLowerCase() === e) {
        userId = a.userId;
        break;
      }
    }
  }
  if (!userId) return { ok: false, message: "No user with that email on this device" };
  const w = ensureWallet(s, userId);
  const next = w.credits + amount;
  if (next < 0) return { ok: false, message: `Cannot go below 0 (current balance ${w.credits})` };
  w.credits = next;
  // Only real pack purchases should raise creditsPurchased.
  // Admin grant adjusts balance only (Bought column stays purchase history).
  if (amount > 0) {
    w.hasPlan = true;
  }
  s.wallets[userId] = w;
  write(s);
  return { ok: true, userId, credits: w.credits };
}

const PAYOUT_KEY = "radiusmeet.payout.paypal";

export function getPayoutPaypal(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(PAYOUT_KEY) || "";
}

export function setPayoutPaypal(email: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PAYOUT_KEY, email.trim());
}

export function spendCredits(
  amount: number,
): { ok: true; wallet: LocalWallet } | { ok: false; reason: "paywall"; wallet: LocalWallet } {
  const s = read();
  const id = s.sessionUserId;
  if (!id) return { ok: false, reason: "paywall", wallet: emptyWallet() };
  const w = ensureWallet(s, id);
  const profile = s.profiles[id];
  if (profile?.isAdmin) return { ok: true, wallet: { ...w } };
  if (w.credits < amount) return { ok: false, reason: "paywall", wallet: { ...w } };
  w.credits -= amount;
  w.creditsSpent = (w.creditsSpent || 0) + amount;
  s.wallets[id] = w;
  write(s);
  return { ok: true, wallet: { ...w } };
}

/** Count my text sends in a conversation. */
export function countMySends(conversationId: string): number {
  return read().messages.filter(
    (m) => m.conversationId === conversationId && m.sender === "me" && (m.kind ?? "text") === "text",
  ).length;
}

/** Count peer text messages in a conversation. */
export function countPeerTexts(conversationId: string): number {
  return read().messages.filter(
    (m) => m.conversationId === conversationId && m.sender === "peer" && (m.kind ?? "text") === "text",
  ).length;
}

/** How many free sends left in this chat (0 if has plan = unlimited via credits path). */
export function freeSendsLeft(conversationId: string): number {
  const s = read();
  const id = s.sessionUserId;
  if (!id) return 0;
  const w = ensureWallet(s, id);
  if (w.hasPlan || s.profiles[id]?.isAdmin) return 9999;
  return Math.max(0, ECONOMY.freeSendsPerChat - countMySends(conversationId));
}

/** Whether the next peer reply should be free to read. */
export function nextPeerReplyShouldBeFree(conversationId: string): boolean {
  const s = read();
  const id = s.sessionUserId;
  if (!id) return false;
  const w = ensureWallet(s, id);
  if (w.hasPlan || s.profiles[id]?.isAdmin) return true;
  return countPeerTexts(conversationId) < ECONOMY.freeReadsPerChat;
}

/**
 * Send text: first freeSendsPerChat messages in this conversation are free,
 * then 1 credit each. Requires conversationId.
 */
export function spendForSendText(conversationId: string):
  | { ok: true; freeLeft: number }
  | { ok: false; reason: "paywall" } {
  const s = read();
  const id = s.sessionUserId;
  if (!id) return { ok: false, reason: "paywall" };
  const w = ensureWallet(s, id);
  if (s.profiles[id]?.isAdmin) return { ok: true, freeLeft: 9999 };

  const used = countMySends(conversationId);
  if (used < ECONOMY.freeSendsPerChat) {
    // free — no wallet mutation needed (count is derived from messages)
    return { ok: true, freeLeft: ECONOMY.freeSendsPerChat - used - 1 };
  }
  if (w.hasPlan && w.credits >= ECONOMY.sendMessageCredits) {
    w.credits -= ECONOMY.sendMessageCredits;
    w.creditsSpent = (w.creditsSpent ?? 0) + ECONOMY.sendMessageCredits;
    s.wallets[id] = w;
    write(s);
    return { ok: true, freeLeft: 0 };
  }
  // Allow spending credits even without plan after free quota
  if (w.credits >= ECONOMY.sendMessageCredits) {
    w.credits -= ECONOMY.sendMessageCredits;
    w.creditsSpent = (w.creditsSpent ?? 0) + ECONOMY.sendMessageCredits;
    s.wallets[id] = w;
    write(s);
    return { ok: true, freeLeft: 0 };
  }
  return { ok: false, reason: "paywall" };
}

/** Can this user open a new chat? (max freeChatsOnSignup without a plan) */
export function canOpenNewChat():
  | { ok: true }
  | { ok: false; reason: "chat_limit" } {
  const s = read();
  const id = s.sessionUserId;
  if (!id) return { ok: false, reason: "chat_limit" };
  const w = ensureWallet(s, id);
  if (w.hasPlan || s.profiles[id]?.isAdmin) return { ok: true };
  if (s.conversations.length >= ECONOMY.freeChatsOnSignup) {
    return { ok: false, reason: "chat_limit" };
  }
  return { ok: true };
}

export function addEarnings(amount: number, reason = "activity") {
  const s = read();
  const id = s.sessionUserId;
  if (!id || amount <= 0) return;
  const w = ensureWallet(s, id);
  w.earnings += amount;
  if (!s.earningsLedger[id]) s.earningsLedger[id] = [];
  s.earningsLedger[id]!.push({ amount, at: Date.now(), reason });
  s.wallets[id] = w;
  write(s);
}

/** Earnings within the last ~6 months (for withdraw eligibility). */
export function getEligibleEarnings(userId?: string): number {
  const s = read();
  const id = userId ?? s.sessionUserId;
  if (!id) return 0;
  const cutoff = Date.now() - ECONOMY.withdrawWindowMs;
  const ledger = s.earningsLedger[id] ?? [];
  return ledger.filter((e) => e.at >= cutoff).reduce((sum, e) => sum + e.amount, 0);
}

export function createWithdrawRequest():
  | { ok: true; request: WithdrawRequest }
  | { ok: false; message: string } {
  const s = read();
  const id = s.sessionUserId;
  if (!id) return { ok: false, message: "Not signed in" };
  const profile = s.profiles[id];
  if (!profile || profile.gender !== "woman") {
    return { ok: false, message: "Reward requests are for woman accounts." };
  }
  const eligible = getEligibleEarnings(id);
  if (eligible < ECONOMY.withdrawCreditsRequired) {
    return {
      ok: false,
      message: `Need ${ECONOMY.withdrawCreditsRequired} points (you have ${eligible}). Keep chatting to earn more.`,
    };
  }
  const pending = s.withdrawRequests.find((r) => r.userId === id && r.status === "pending");
  if (pending) return { ok: false, message: "You already have a pending reward request. Admin will review it." };

  const req: WithdrawRequest = {
    id: uid(),
    userId: id,
    displayName: profile.displayName,
    email: profile.email,
    phone: profile.phone,
    amountCredits: ECONOMY.withdrawCreditsRequired,
    amountUsd: ECONOMY.withdrawUsd,
    status: "pending",
    createdAt: Date.now(),
  };
  s.withdrawRequests.unshift(req);
  write(s);
  return { ok: true, request: req };
}

/** Admin: mark request paid (cash outside app) or grant credit reward. */
export function adminFulfillWithdraw(
  requestId: string,
  mode: "paid" | "credits_rewarded" | "rejected",
): { ok: true } | { ok: false; message: string } {
  const s = read();
  const r = s.withdrawRequests.find((x) => x.id === requestId);
  if (!r) return { ok: false, message: "Request not found" };
  if (r.status !== "pending") return { ok: false, message: "Already handled" };

  if (mode === "rejected") {
    r.status = "rejected";
    r.fulfillNote = "Rejected by admin";
    write(s);
    return { ok: true };
  }
  if (mode === "paid") {
    r.status = "paid";
    r.fulfillNote = `Cash ~$${r.amountUsd} paid outside app`;
    write(s);
    return { ok: true };
  }
  // credits reward to woman wallet
  const w = ensureWallet(s, r.userId);
  const bonus = ECONOMY.withdrawCreditReward;
  w.credits += bonus;
  r.status = "credits_rewarded";
  r.fulfillNote = `Granted ${bonus} credits in-app`;
  s.wallets[r.userId] = w;
  write(s);
  return { ok: true };
}

export function listWithdrawRequests(): WithdrawRequest[] {
  return [...read().withdrawRequests].sort((a, b) => b.createdAt - a.createdAt);
}

export function setWithdrawStatus(requestId: string, status: "paid" | "rejected" | "pending") {
  const s = read();
  const r = s.withdrawRequests.find((x) => x.id === requestId);
  if (!r) return;
  r.status = status;
  write(s);
}

export function sendSupportMessage(body: string): SupportMessage {
  const s = read();
  const id = s.sessionUserId;
  if (!id) throw new Error("Not signed in");
  const profile = s.profiles[id];
  const msg: SupportMessage = {
    id: uid(),
    userId: id,
    displayName: profile?.displayName ?? "User",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    body: body.trim(),
    fromAdmin: Boolean(profile?.isAdmin),
    createdAt: Date.now(),
    readByAdmin: Boolean(profile?.isAdmin),
  };
  s.supportMessages.push(msg);
  write(s);
  return msg;
}

/** Admin reply shown in support thread (fromAdmin = true). */
export function adminReplyToUser(opts: {
  body: string;
  toUserId?: string;
  toEmail?: string;
  toName?: string;
  toPhone?: string;
}): SupportMessage {
  const s = read();
  const adminId = s.sessionUserId;
  if (!adminId) throw new Error("Not signed in");
  const admin = s.profiles[adminId];
  const msg: SupportMessage = {
    id: uid(),
    userId: opts.toUserId || adminId,
    displayName: opts.toName || "User",
    email: opts.toEmail || "",
    phone: opts.toPhone || "",
    body: opts.body.trim(),
    fromAdmin: true,
    createdAt: Date.now(),
    readByAdmin: true,
  };
  s.supportMessages.push(msg);
  write(s);
  return msg;
}

export function listSupportMessages(): SupportMessage[] {
  return [...read().supportMessages].sort((a, b) => b.createdAt - a.createdAt);
}

export function getSupportTicketStatus(email: string): "open" | "closed" {
  const key = email.trim().toLowerCase();
  return read().supportTickets?.[key]?.status ?? "open";
}

export function setSupportTicketStatus(
  email: string,
  status: "open" | "closed",
): void {
  const s = read();
  if (!s.supportTickets) s.supportTickets = {};
  const key = email.trim().toLowerCase();
  s.supportTickets[key] = {
    status,
    closedAt: status === "closed" ? Date.now() : undefined,
  };
  write(s);
}

export function listSupportThreads(): Array<{
  email: string;
  userId: string;
  displayName: string;
  phone: string;
  status: "open" | "closed";
  lastAt: number;
  preview: string;
  messages: SupportMessage[];
}> {
  const s = read();
  if (!s.supportTickets) s.supportTickets = {};
  const byEmail = new Map<string, SupportMessage[]>();
  for (const m of s.supportMessages) {
    const key = (m.email || m.userId || "unknown").toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(m);
  }
  const threads = [];
  for (const [email, msgs] of byEmail) {
    const sorted = [...msgs].sort((a, b) => a.createdAt - b.createdAt);
    const last = sorted[sorted.length - 1]!;
    const firstUser = sorted.find((x) => !x.fromAdmin) ?? last;
    threads.push({
      email: firstUser.email || email,
      userId: firstUser.userId,
      displayName: firstUser.displayName,
      phone: firstUser.phone,
      status: (s.supportTickets[email]?.status ?? "open") as "open" | "closed",
      lastAt: last.createdAt,
      preview: last.body,
      messages: sorted,
    });
  }
  return threads.sort((a, b) => b.lastAt - a.lastAt);
}


export function markSupportReadByAdmin() {
  const s = read();
  for (const m of s.supportMessages) {
    if (!m.fromAdmin) m.readByAdmin = true;
  }
  write(s);
}

/** All non-admin profiles with wallet stats (admin dashboard). */
export function listUserStats() {
  const s = read();
  const rows = Object.values(s.profiles)
    .filter((p) => !p.isAdmin)
    .map((p) => {
      const w = ensureWallet(s, p.userId);
      const eligible = getEligibleEarnings(p.userId);
      return {
        userId: p.userId,
        displayName: p.displayName,
        email: p.email,
        phone: p.phone,
        gender: p.gender,
        area: p.area,
        credits: w.credits,
        creditsSpent: w.creditsSpent || 0,
        creditsPurchased: w.creditsPurchased || 0,
        earnings: w.earnings || 0,
        eligibleEarnings: eligible,
        hasPlan: w.hasPlan,
      };
    });
  return rows;
}


export function listConversations(): LocalConversation[] {
  const s = read();
  if (!s.sessionUserId) return [];
  return [...s.conversations].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

export function openLocalChat(peerId: string, peerKind: "sample" | "user"): string {
  const s = read();
  const id = s.sessionUserId;
  if (!id) throw new Error("Not signed in");
  const existing = s.conversations.find((c) => c.peerId === peerId && c.peerKind === peerKind);
  if (existing) return existing.id;
  // New conversation — enforce free chat limit
  const gate = canOpenNewChat();
  if (!gate.ok) throw new Error("CHAT_LIMIT");
  const convId = uid();
  s.conversations.push({
    id: convId,
    peerId,
    peerKind,
    lastBody: "",
    lastAt: new Date().toISOString(),
  });
  write(s);
  return convId;
}

export function getMessages(conversationId: string): LocalMessage[] {
  const s = read();
  return s.messages
    .filter((m) => m.conversationId === conversationId)
    .map((m) => ({
      kind: m.kind ?? "text",
      locked: typeof m.locked === "boolean" ? m.locked : m.sender === "peer",
      ...m,
    }))
    .sort((a, b) => a.id - b.id);
}

export function getConversation(conversationId: string): LocalConversation | null {
  return read().conversations.find((c) => c.id === conversationId) ?? null;
}

export function appendMessage(
  conversationId: string,
  msg: Omit<LocalMessage, "id" | "conversationId" | "createdAt"> & { createdAt?: string },
) {
  const s = read();
  const conv = s.conversations.find((c) => c.id === conversationId);
  if (!conv) throw new Error("Chat not found");
  const now = msg.createdAt ?? new Date().toISOString();
  const full: LocalMessage = {
    id: s.messageSeq++,
    conversationId,
    sender: msg.sender,
    body: msg.body,
    kind: msg.kind ?? "text",
    payload: msg.payload,
    locked: msg.locked ?? false,
    createdAt: now,
  };
  s.messages.push(full);
  conv.lastBody =
    full.kind === "gift" ? "🎁 Gift" : full.kind === "photo" ? "📷 Photo" : full.kind === "system" ? full.body : full.body;
  conv.lastAt = now;
  write(s);
  return full;
}

export function unlockMessage(messageId: number):
  | { ok: true }
  | { ok: false; reason: "paywall" | "need_plan" | "not_found" } {
  const s = read();
  const id = s.sessionUserId;
  if (!id) return { ok: false, reason: "paywall" };
  const w = ensureWallet(s, id);
  if (s.profiles[id]?.isAdmin) {
    const msg = s.messages.find((m) => m.id === messageId);
    if (msg) msg.locked = false;
    write(s);
    return { ok: true };
  }
  if (!w.hasPlan) return { ok: false, reason: "need_plan" };
  const msg = s.messages.find((m) => m.id === messageId);
  if (!msg) return { ok: false, reason: "not_found" };
  if (!msg.locked) return { ok: true };
  const cost =
    msg.kind === "gift"
      ? ECONOMY.unlockGiftCredits
      : msg.kind === "photo"
        ? ECONOMY.unlockPhotoCredits
        : ECONOMY.unlockMessageCredits;
  if (w.credits < cost) return { ok: false, reason: "paywall" };
  w.credits -= cost;
  msg.locked = false;
  s.wallets[id] = w;
  write(s);
  return { ok: true };
}

export function clearAllLocalData() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
}


export function isCurrentUserAdmin(): boolean {
  const p = getProfile();
  return Boolean(p?.isAdmin);
}

/** Admin and chats with admin: never charge. */
export function shouldSkipCharges(): boolean {
  return isCurrentUserAdmin();
}
