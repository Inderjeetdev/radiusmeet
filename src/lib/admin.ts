/**
 * Admin accounts: everything free (chat, video, gifts, unlocks).
 *
 * PAYMENTS (two different flows):
 *
 * 1) Users BUYING credits (men / payers)
 *    → Google Play Billing only (Android).
 *    → Money goes to YOUR bank account linked in Google Play Console
 *      (not PayPal). Web is sandbox only.
 *
 * 2) Women WITHDRAWING earnings
 *    → User requests withdraw in app → you approve in /admin
 *    → You send money manually via PayPal / UPI / bank to HER details
 *    → PAYOUT_PAYPAL_EMAIL is YOUR account (optional note of where you
 *      pay FROM, or your business PayPal). Edit on /admin too.
 */
export const ADMIN_EMAILS = [
  "admin@radiusmeet.app",
  "admin@radiusmeet.local",
  "mstrinderjeet@gmail.com",
  "misterinderjeet@gmail.com",
].map((e) => e.toLowerCase());

export const ADMIN_PHONES = [
  // e.g. "+919999999999",
].map((p) => p.replace(/\s+/g, ""));

/** Your business PayPal (manual woman payouts / records). Not used for Play purchases. */
export const PAYOUT_PAYPAL_EMAIL = "mstrinderjeet@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function isAdminPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const p = phone.replace(/\s+/g, "");
  return ADMIN_PHONES.includes(p);
}
