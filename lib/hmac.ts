import crypto from "crypto";

/**
 * Shared HMAC scheme for check-in QR codes. Also employed by backend.
 *   message = `${userId}/${firstName}/${lastName}/${confirmedRsvpAt}`
 *   sig     = base64url(HMAC_SHA256(SECRET, message)).slice(0, SIG_LEN)
 *   QR      = `${message}/${sig}`
 */

const SECRET = process.env.CHECKIN_HMAC_SECRET;
const SIG_LEN = 22; // 22 base64url chars ≈ 128 bits

export function isHmacEnabled(): boolean {
  return !!SECRET; // when no secret, then skip hmac verification
}

export function signCheckIn(message: string): string {
  if (!SECRET) throw new Error("CHECKIN_HMAC_SECRET is not set");
  return crypto
    .createHmac("sha256", SECRET)
    .update(message)
    .digest("base64url")
    .slice(0, SIG_LEN);
}

/** Constant-time comparison so we don't leak the signature via timing. */
export function verifyCheckIn(message: string, signature: string): boolean {
  if (!SECRET) return false;
  const expected = Buffer.from(signCheckIn(message));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
