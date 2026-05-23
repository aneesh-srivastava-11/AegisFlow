import admin from 'firebase-admin';

if (admin.apps.length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle newlines in private key
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[Firebase Admin] Initialized with Service Account cert');
  } else {
    // Fallback to local emulator or application default credentials (ADC) if keys aren't set
    // This allows local builds to continue without crashing immediately
    try {
      admin.initializeApp();
      console.log('[Firebase Admin] Initialized with Application Default Credentials');
    } catch (e) {
      console.warn('[Firebase Admin] Initialization failed: credentials not provided. Server-side auth will fail.');
    }
  }
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export default admin;
