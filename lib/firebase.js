import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app = null;
let auth = null;

// Safeguard against missing configuration during build or before environment variables setup
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
} else {
  console.warn(
    '[Firebase Client] NEXT_PUBLIC_FIREBASE_API_KEY is missing. ' +
    'Client SDK is using local fallback dummy configurations.'
  );
  
  // Minimal dummy interface to satisfy imports and static generation evaluation
  auth = {
    onAuthStateChanged: (callback) => {
      // Defer execution to client-side only
      if (typeof window !== 'undefined') {
        callback(null);
      }
      return () => {};
    },
    signInWithEmailAndPassword: async () => {
      throw new Error('Firebase Client SDK is not initialized. Check your environment variables.');
    },
    signOut: async () => {},
  };
}

export { app, auth };
