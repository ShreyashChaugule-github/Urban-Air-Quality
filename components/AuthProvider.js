"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "@firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

const AuthContext = createContext({ user: null, loading: true, configured: false, signOutUser: async () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, nextUser => {
      setUser(nextUser);
      setLoading(false);
    }, () => {
      setUser(null);
      setLoading(false);
    });
  }, []);

  async function signOutUser() {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
  }

  return <AuthContext.Provider value={{ user, loading, configured: isFirebaseConfigured(), signOutUser }}>{children}</AuthContext.Provider>;
}