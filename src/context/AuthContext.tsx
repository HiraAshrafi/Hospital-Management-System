"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, tokens } from "@/lib/api";
import type { LoginResponse, Profile } from "@/lib/types";

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: Profile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadSession(): Promise<Profile | null> {
  if (!tokens.access()) return null;
  try {
    return await api<Profile>("/auth/me/");
  } catch {
    tokens.clear();
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSession().then((profile) => {
      if (cancelled) return;
      setUser(profile);
      setLoading(false);
    });
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => {
      cancelled = true;
      window.removeEventListener("auth:logout", onLogout);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<LoginResponse>("/auth/login/", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    tokens.set(data.access, data.refresh);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokens.refresh();
    try {
      if (refresh) await api("/auth/logout/", { method: "POST", body: { refresh } });
    } catch {
      /* token may already be invalid */
    }
    tokens.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, setUser }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
