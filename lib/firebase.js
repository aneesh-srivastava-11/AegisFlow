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

  // Bug #3 fix: Complete dummy interface matching ALL methods called by AuthContext.jsx.
  // Previously only onAuthStateChanged, signInWithEmailAndPassword, and signOut were mocked,
  // causing cryptic crashes when createUserWithEmailAndPassword, sendPasswordResetEmail,
  // or signInWithPopup (GitHub/GitLab OAuth) were invoked without Firebase being initialized.
  const notInitializedError = () => {
    throw new Error('Firebase Client SDK is not initialized. Check your NEXT_PUBLIC_FIREBASE_* environment variables.');
  };

  const mockUser = {
    uid: 'mock-dev-admin',
    email: 'test1@test.com',
    getIdToken: async () => 'mock-token-123',
  };

  let currentUserState = null;
  let authStateListener = null;

  auth = {
    onAuthStateChanged: (callback) => {
      authStateListener = callback;
      if (typeof window !== 'undefined') {
        callback(currentUserState);
      }
      return () => { authStateListener = null; };
    },
    signInWithEmailAndPassword: async (auth, email, password) => {
      if (email === 'test1@test.com' && password === 'test1234') {
        currentUserState = mockUser;
        if (authStateListener) authStateListener(currentUserState);
        return { user: mockUser };
      }
      notInitializedError();
    },
    createUserWithEmailAndPassword: async () => notInitializedError(),
    sendPasswordResetEmail: async () => notInitializedError(),
    signInWithPopup: async () => notInitializedError(),
    signOut: async () => {
      currentUserState = null;
      if (authStateListener) authStateListener(null);
    },
    currentUser: currentUserState,
  };
}

export { app, auth };
