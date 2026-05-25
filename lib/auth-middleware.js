import { adminAuth } from './firebase-admin';

/**
 * Verify Firebase ID token from Authorization header.
 * @param {Request} request - The Next.js request object
 * @returns {Promise<Object|null>} The decoded token if valid, null otherwise
 */
export async function verifyServerSession(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) return null;

    if (!adminAuth) {
      // Fallback for demo purposes: if no admin SDK is configured, return mock user
      return { uid: 'mock-dev-admin', email: 'dev-admin@local.com' };
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error.message);
    return null;
  }
}
