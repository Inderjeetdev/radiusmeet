/**
 * Google Play Billing layer for RadiusMeet credit packs.
 *
 * On a real Play Store Android build:
 *  - Create the same product IDs in Play Console → Monetize → Products → In-app products
 *  - Use Google Play Billing Library (or Capacitor Purchases / cordova-plugin-purchase)
 *  - Call purchasePack() which will route to native billing when available
 *
 * In web / preview: uses sandbox mode (grants credits without charging).
 *
 * You get paid via Play Console → financial reports → your bank account
 * (after Google’s commission, typically ~15% after the first year threshold rules).
 */

export type PackId = "starter" | "plus" | "night";

export type CreditPack = {
  id: PackId;
  /** Must match Play Console product id exactly */
  playProductId: string;
  name: string;
  credits: number;
  /** Display price in minor units (cents). Real price is set in Play Console. */
  cents: number;
  currency: "USD";
  blurb: string;
};

/** Catalog — create these three managed products in Play Console */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    playProductId: "radiusmeet_credits_starter",
    name: "Starter",
    credits: 40,
    cents: 499,
    currency: "USD",
    blurb: "A handful of extra texts",
  },
  {
    id: "plus",
    playProductId: "radiusmeet_credits_plus",
    name: "Plus",
    credits: 120,
    cents: 999,
    currency: "USD",
    blurb: "Texts plus a video night",
  },
  {
    id: "night",
    playProductId: "radiusmeet_credits_night",
    name: "Night",
    credits: 300,
    cents: 1999,
    currency: "USD",
    blurb: "For people who stay up talking",
  },
];

export const VIDEO_COST_CREDITS = 25;
export const EXTRA_TEXT_COST_CREDITS = 1;

export type PurchaseResult =
  | {
      ok: true;
      packId: PackId;
      creditsGranted: number;
      /** play = real Play Billing; sandbox = preview / web */
      source: "play" | "sandbox";
      /** Play purchase token when real (verify on backend if you add one later) */
      purchaseToken?: string;
    }
  | { ok: false; reason: "cancelled" | "unavailable" | "error" | "unknown_pack"; message?: string };

/** Detect Capacitor / Android Play Billing bridge if you inject one later */
function getNativeBilling():
  | {
      purchase: (productId: string) => Promise<{
        purchaseToken: string;
        productId: string;
      }>;
    }
  | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    RadiusMeetBilling?: {
      purchase: (productId: string) => Promise<{ purchaseToken: string; productId: string }>;
    };
  };
  return w.RadiusMeetBilling ?? null;
}

export function isNativePlayBillingAvailable(): boolean {
  return getNativeBilling() != null;
}

/**
 * Buy a credit pack.
 * - Android with bridge → Google Play purchase sheet (real money to you)
 * - Otherwise → sandbox grant (for testing UI)
 */
export async function purchasePack(packId: PackId): Promise<PurchaseResult> {
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return { ok: false, reason: "unknown_pack", message: "Unknown pack" };

  const native = getNativeBilling();
  if (native) {
    try {
      const result = await native.purchase(pack.playProductId);
      return {
        ok: true,
        packId: pack.id,
        creditsGranted: pack.credits,
        source: "play",
        purchaseToken: result.purchaseToken,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/cancel/i.test(msg)) return { ok: false, reason: "cancelled", message: msg };
      return { ok: false, reason: "error", message: msg };
    }
  }

  // Sandbox (web preview / before Android bridge is wired)
  return {
    ok: true,
    packId: pack.id,
    creditsGranted: pack.credits,
    source: "sandbox",
  };
}

export function formatPackPrice(pack: CreditPack): string {
  return `$${(pack.cents / 100).toFixed(2)}`;
}
