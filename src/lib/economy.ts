/**
 * RadiusMeet freemium economy (coin-style chat apps).
 */

export const ECONOMY = {
  freeTextsOnSignup: 3,
  sendMessageCredits: 1,
  unlockMessageCredits: 1,
  sendGiftCredits: 8,
  unlockGiftCredits: 5,
  unlockPhotoCredits: 4,
  videoFreeSeconds: 10,
  videoCreditsPerMinute: 15,
  /** Share of payer's video spend credited to woman peer */
  videoCreatorShare: 0.3,
  /** Credits credited to woman when someone unlocks her message */
  girlEarnOnMessageUnlock: 1,
  /** When someone sends her a gift (from the gift spend) */
  girlEarnOnGiftReceived: 3,
  /** When someone unlocks her photo */
  girlEarnOnPhotoUnlock: 2,
  starterUnlockCredits: 40,
  /** Withdraw: 1000 earned credits → $10 request (men paid far more into the pool via packs) */
  withdrawCreditsRequired: 1000,
  withdrawUsd: 10,
  /** Earnings older than this do not count toward withdraw */
  withdrawWindowMs: 1000 * 60 * 60 * 24 * 183, // ~6 months

} as const;

export type MessageKind = "text" | "gift" | "photo";

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
