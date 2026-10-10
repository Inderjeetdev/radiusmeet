/**
 * RadiusMeet freemium economy (coin-style chat apps).
 */

export const ECONOMY = {
  /** Max free conversations for a new account (no plan). */
  freeChatsOnSignup: 10,
  /** Free outgoing text messages per conversation. */
  freeSendsPerChat: 5,
  /** Free readable peer messages per conversation (then unlock with credits). */
  freeReadsPerChat: 5,
  /** @deprecated kept for wallet shape / migration; not used for new logic */
  freeTextsOnSignup: 0,
  /** One-time credits for woman accounts after setup (engagement / attract buyers). */
  womanWelcomeCredits: 250,
  sendMessageCredits: 1,
  unlockMessageCredits: 1,
  sendGiftCredits: 8,
  unlockGiftCredits: 5,
  unlockPhotoCredits: 4,
  videoFreeSeconds: 10,
  videoCreditsPerMinute: 15,
  /** Charged once when you place a video call (even practice). */
  videoCallStartCredits: 5,
  /** Share of payer's video spend credited to woman peer */
  videoCreatorShare: 0.3,
  /** Credits credited to woman when someone unlocks her message */
  girlEarnOnMessageUnlock: 1,
  /** When someone sends her a gift (from the gift spend) */
  girlEarnOnGiftReceived: 3,
  /** When someone unlocks her photo */
  girlEarnOnPhotoUnlock: 2,
  starterUnlockCredits: 40,
  /**
   * Woman reward points (not auto-cash).
   * At this threshold she can notify admin; admin pays cash OR grants credit reward.
   * User purchases still go to admin via Google Play → bank.
   */
  withdrawCreditsRequired: 1000,
  /** Suggested cash reward when admin marks paid (manual) */
  withdrawUsd: 10,
  /** Optional credit reward admin can grant instead of / with cash */
  withdrawCreditReward: 100,
  /** Earnings older than this do not count toward withdraw */
  withdrawWindowMs: 1000 * 60 * 60 * 24 * 183, // ~6 months

} as const;

export type MessageKind = "text" | "gift" | "photo" | "system";

export const GIFT_PRESETS = [
  { id: "heart", label: "Heart", emoji: "💕", blurb: "A warm hello" },
  { id: "rose", label: "Rose", emoji: "🌹", blurb: "Classic" },
  { id: "star", label: "Star", emoji: "⭐", blurb: "You're a star" },
] as const;

export const HOBBY_OPTIONS = [
  "Music",
  "Travel",
  "Fitness",
  "Cooking",
  "Movies",
  "Reading",
  "Gaming",
  "Dance",
  "Photography",
  "Sports",
  "Art",
  "Fashion",
] as const;

export type SmokeDrink = "no" | "sometimes" | "yes" | "prefer_not";
