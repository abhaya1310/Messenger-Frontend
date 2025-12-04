"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  getStoredAuth,
  clearAuth,
  type LoginCredentials,
  type AuthState,
  // Legacy support
  validateCredentials,
} from "@/lib/auth";
import type { User } from "@/lib/types/org-settings";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  orgId: string | null;
  orgName: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  loginLegacy: (credentials: { id: string; password: string }) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    orgId: null,
    orgName: null,
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth on mount
  useEffect(() => {
    const stored = getStoredAuth();
    setAuthState(stored);
    setIsLoading(false);
  }, []);

  // New API-based login
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      const response = await apiLogin(credentials);
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        orgId: response.orgId,
        orgName: response.orgName,
        token: response.token,
      });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  // Legacy login for backwards compatibility
  const loginLegacy = (credentials: { id: string; password: string }): boolean => {
    const isValid = validateCredentials(credentials);
    if (isValid) {
      // Set a basic authenticated state without org info
      setAuthState({
        isAuthenticated: true,
        user: null,
        orgId: process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || null,
        orgName: 'Default Organization',
        token: null,
      });
    }
    return isValid;
  };

  const logout = () => {
    clearAuth();
    setAuthState({
      isAuthenticated: false,
      user: null,
      orgId: null,
      orgName: null,
      token: null,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authState.isAuthenticated,
        isLoading,
        user: authState.user,
        orgId: authState.orgId,
        orgName: authState.orgName,
        login,
        loginLegacy,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
