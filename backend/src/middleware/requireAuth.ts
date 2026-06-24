import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/token.service.js';

/**
 * Express middleware that protects routes requiring user authentication.
 * Resolves the JWT from the Authorization header and attaches the user's ID to the request object.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // Step 1 & 2: Read and validate Authorization header exists
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Step 3: Validate header starts with "Bearer" prefix
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Step 4: Extract token
  const token = authHeader.substring(7).trim();

  try {
    // Step 5: Verify token using token service
    const payload = verifyToken(token);

    // Step 6: Extract and assign userId to req.userId
    req.userId = payload.userId;

    // Step 7: Call next middleware
    next();
  } catch (error) {
    // Catch token expired, signature invalid, or malformed issues and return a generic 401 error.
    // We do not leak internal JWT parsing details or stack traces for security reasons.
    res.status(401).json({ error: 'Unauthorized' });
  }
};
