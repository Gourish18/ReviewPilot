import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { generateToken, verifyToken } from './services/token.service.js';

async function runVerification() {
  console.log('--- Phase D Authentication & JWT Foundation Verification ---');

  const testUserId = 'user_6a2f7040b563dc3798ae8265';

  // Test 1: Generate token
  console.log('\n[Test 1] Generating token...');
  const token = generateToken(testUserId);
  console.log('Token String Generated:', token);
  if (typeof token === 'string' && token.length > 0) {
    console.log('SUCCESS: Token is a non-empty string.');
  } else {
    console.error('FAIL: Token generation did not return a valid string.');
    process.exitCode = 1;
    return;
  }

  // Verify the payload content by decoding it (without signature verification first)
  const decodedDirectly = jwt.decode(token) as any;
  console.log('Decoded payload directly (no verification):', decodedDirectly);
  if (decodedDirectly && decodedDirectly.userId === testUserId) {
    console.log('SUCCESS: Generated token payload contains correct userId.');
  } else {
    console.error('FAIL: Token payload does not contain correct userId.');
    process.exitCode = 1;
  }

  // Test 2: Verify valid token
  console.log('\n[Test 2] Verifying valid token...');
  try {
    const payload = verifyToken(token);
    console.log('Verified payload:', payload);
    if (payload.userId === testUserId) {
      console.log('SUCCESS: verifyToken successfully verified and returned the correct payload.');
    } else {
      console.error('FAIL: verifyToken returned wrong userId.');
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('FAIL: verifyToken threw an error for a valid token:', err.message);
    process.exitCode = 1;
  }

  // Test 3: Expired token verification
  console.log('\n[Test 3] Verifying expired token rejection...');
  // Create a token that has already expired using past 'iat' (issued at)
  const pastIat = Math.floor(Date.now() / 1000) - 100; // issued 100 seconds ago
  const expiredToken = jwt.sign(
    { userId: testUserId, iat: pastIat },
    env.jwtSecret,
    { expiresIn: '10s' } // expired 90 seconds ago
  );
  console.log('Expired Token String:', expiredToken);

  try {
    verifyToken(expiredToken);
    console.error('FAIL: verifyToken did not throw an error for an expired token!');
    process.exitCode = 1;
  } catch (err: any) {
    if (err instanceof jwt.TokenExpiredError) {
      console.log('SUCCESS: verifyToken caught the expired token and threw TokenExpiredError as expected.');
      console.log('Error message:', err.message);
    } else {
      console.error('FAIL: verifyToken threw an unexpected error type for expired token:', err);
      process.exitCode = 1;
    }
  }

  // Test 4: Invalid token verification
  console.log('\n[Test 4] Verifying invalid/malformed token rejection...');
  const invalidToken = token + '_tampered';
  try {
    verifyToken(invalidToken);
    console.error('FAIL: verifyToken did not throw an error for an invalid/tampered token!');
    process.exitCode = 1;
  } catch (err: any) {
    if (err instanceof jwt.JsonWebTokenError) {
      console.log('SUCCESS: verifyToken caught the tampered token and threw JsonWebTokenError as expected.');
      console.log('Error message:', err.message);
    } else {
      console.error('FAIL: verifyToken threw an unexpected error type for invalid token:', err);
      process.exitCode = 1;
    }
  }

  console.log('\nJWT Infrastructure tests finished.');
}

void runVerification();
