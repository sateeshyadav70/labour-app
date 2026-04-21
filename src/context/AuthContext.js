import React, { createContext, useEffect, useContext, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext(null);
const SESSION_STORAGE_KEY = "@fixora.auth.session";

const normalizeSession = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const token = value.token || null;
  const user = value.user || null;

  if (!token || !user) {
    return null;
  }

  return {
    token,
    accountType: value.accountType || "user",
    user,
    worker: value.worker || null,
  };
};


export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!mounted) {
          return;
        }

        if (stored) {
          setSession(normalizeSession(JSON.parse(stored)));
        }
      } catch (_error) {
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const persistSession = async () => {
      try {
        if (session) {
          await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } else {
          await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch (_error) {
        // Keep the in-memory session even if storage is temporarily unavailable.
      }
    };

    persistSession();
  }, [isReady, session]);

  const value = useMemo(
    () => ({
      session,
      currentUser: session?.user || null,
      authToken: session?.token || null,
      accountType: session?.accountType || "user",
      isAuthenticated: Boolean(session?.token),
      isReady,
      signIn: (nextSession) => setSession(normalizeSession(nextSession)),
      signOut: () => setSession(null),
    }),
    [isReady, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
