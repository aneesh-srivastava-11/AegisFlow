'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  sendPasswordReset: async () => {},
  loginWithGithub: async () => {},
  loginWithGitlab: async () => {},
  logout: async () => {},
});

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userToken = await currentUser.getIdToken(true);
        setToken(userToken);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userToken = await result.user.getIdToken(true);
      setToken(userToken);
      setUser(result.user);
      return result.user;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const userToken = await result.user.getIdToken(true);
      setToken(userToken);
      setUser(result.user);
      return result.user;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGithub = async () => {
    setLoading(true);
    try {
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userToken = await result.user.getIdToken(true);
      setToken(userToken);
      setUser(result.user);
      return result.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGitlab = async () => {
    setLoading(true);
    try {
      const provider = new OAuthProvider('gitlab.com');
      const result = await signInWithPopup(auth, provider);
      const userToken = await result.user.getIdToken(true);
      setToken(userToken);
      setUser(result.user);
      return result.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, sendPasswordReset, loginWithGithub, loginWithGitlab, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
