/**
 * Admin accounts: everything free (chat, video, gifts, unlocks).
 * Users chatting with admin also get free messaging with the admin.
 *
 * After download, set your admin emails / phones here (and optionally in Firebase custom claims later).
 */
export const ADMIN_EMAILS = [
  "admin@radiusmeet.app",
  "admin@radiusmeet.local",
].map((e) => e.toLowerCase());

export const ADMIN_PHONES = [
  // e.g. "+919999999999",
].map((p) => p.replace(/\s+/g, ""));

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function isAdminPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const p = phone.replace(/\s+/g, "");
  return ADMIN_PHONES.includes(p);
}
