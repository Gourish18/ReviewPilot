import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Verifies the validity of a GitHub webhook signature header.
 * 
 * ### Security Considerations:
 * 1. **Why GitHub signs webhooks**: Since webhook endpoints are publicly accessible, GitHub signs the payloads using a pre-shared secret key. 
 *    This allows ReviewPilot to verify that the request originated from GitHub and has not been tampered with in transit.
 * 2. **HMAC (Hash-based Message Authentication Code)**: This is a cryptographic mechanism that combines a hash function (SHA-256) with a secret key.
 *    Only parties who know the secret key (GitHub and our server) can generate the matching hash value. An attacker who intercepts or creates
 *    a fake payload cannot generate the matching signature because they lack the `env.githubWebhookSecret`.
 * 3. **timingSafeEqual**: Direct string comparison (`===`) is vulnerable to "timing attacks". A string comparison returns immediately upon 
 *    finding the first non-matching character, making requests with partial signature matches finish slightly faster/slower. An attacker can use 
 *    precise latency measurements to guess the signature byte-by-byte. `crypto.timingSafeEqual()` performs comparison in constant time, 
 *    eliminating this vulnerability.
 * 4. **OAuth vs Webhook verification**: OAuth authenticates a user by exchanging an authorization code for an access token that we store
 *    in our database and send in request headers (e.g. `Bearer <jwt>`). Webhook verification, by contrast, validates the integrity of a passive 
 *    one-way event payload sent from GitHub to our server, utilizing a shared webhook secret and payload HMAC hash.
 * 
 * @param rawBody The raw buffer or string payload of the incoming webhook request.
 * @param signature The signature string from the `x-hub-signature-256` header (expects "sha256=HEX_HASH").
 * @returns true if the signature matches and is valid, false otherwise.
 */
export function verifyGithubSignature(
  rawBody: Buffer | string,
  signature: string
): boolean {
  if (!signature) {
    return false;
  }

  // Step 1: Create HMAC SHA-256 hash using the pre-shared webhook secret
  const hmac = crypto.createHmac('sha256', env.githubWebhookSecret);
  
  // Step 2: Feed the raw request payload into the HMAC
  hmac.update(rawBody);
  
  // Step 3: Digest the HMAC in hex format and prepend the sha256 prefix
  const expectedSignature = 'sha256=' + hmac.digest('hex');

  // Step 4: Convert both expected and received signatures to Buffers
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  // Step 5: Verify signature lengths match.
  // timingSafeEqual throws a TypeError if buffers have different lengths,
  // and unequal length signature is immediately invalid.
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  // Step 6: Use timing-safe constant-time comparison
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
