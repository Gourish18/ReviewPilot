import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Interface representing the strongly-typed payload structure of a ReviewPilot user session JWT.
 */
export interface IUserTokenPayload extends jwt.JwtPayload {
  userId: string;
}

/**
 * Generates a signed JWT for a ReviewPilot user session.
 * 
 * @param userId The database record ID of the user.
 * @returns A cryptographically signed token string.
 */
export function generateToken(userId: string): string {
  // Why userId is enough:
  // Storing only the userId is sufficient to establish identity. On subsequent requests, the backend
  // can use this ID to lookup the database entry for access level, preferences, or active integrations.
  //
  // Why we do NOT store the GitHub token in the JWT:
  // The GitHub access token is highly sensitive and grants access to the user's source code repositories.
  // Storing it in the JWT exposes it to the client/frontend. Instead, the GitHub access token remains
  // securely stored in our server-side database and is never sent to the client.
  //
  // Why we do NOT store the full user object:
  // 1. Keeps token size minimal, reducing payload overhead for every request.
  // 2. Avoids stale data (e.g. if the user changes their username or email, the token remains valid and doesn't hold out-of-date data).
  // 3. Minimizes disclosure of Personally Identifiable Information (PII) to the client.
  const payload: IUserTokenPayload = {
    userId,
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: '7d',
  });
}

/**
 * Verifies the validity of a ReviewPilot session token.
 * 
 * @param token The token string to verify.
 * @returns The decoded and validated token payload.
 * @throws Error if the token is invalid, expired, or missing required fields.
 */
export function verifyToken(token: string): IUserTokenPayload {
  // Allow jwt library to throw errors (JsonWebTokenError, TokenExpiredError) directly,
  // letting caller capture and process the failure reason.
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded === 'string' || !decoded.userId) {
    throw new Error('Invalid token payload: userId missing');
  }

  return decoded as IUserTokenPayload;
}
