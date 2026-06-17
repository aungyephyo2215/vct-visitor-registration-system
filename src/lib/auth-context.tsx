"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { api } from "./api-client";
import type { SafeUser } from "./types";

const publicPaths = ["/", "/login"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

interface AuthState {
  user: SafeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isPublic = isPublicPath(pathname);
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: isPublic ? false : true,
    isAuthenticated: false,
  });

  const refresh = useCallback(async () => {
    try {
      const result = await api.get<{ user: SafeUser }>("/api/v1/auth/me");
      setState({ user: result.user, isLoading: false, isAuthenticated: true });
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  // Initial auth check on mount — calling setState in this effect is intentional
  // as it initializes the auth state from the server on first load.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isPublic) return;
    refresh();
  }, [refresh, isPublic]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const logout = useCallback(async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // ignore
    }
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
