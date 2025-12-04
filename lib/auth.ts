import { config } from './config';
import type { LoginRequest, LoginResponse, User } from './types/org-settings';

const AUTH_STORAGE_KEY = 'connectnow_auth';
const TOKEN_STORAGE_KEY = 'connectnow_token';
const ORG_STORAGE_KEY = 'connectnow_org';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  orgId: string | null;
  orgName: string | null;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authenticates user against the backend API
 * Returns user info, orgId, and token on success
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${config.apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Invalid credentials');
  }

  const data: LoginResponse = await response.json();

  // Store auth data
  storeAuthData(data);

  return data;
}

/**
 * Stores authentication data in localStorage
 */
export function storeAuthData(data: LoginResponse) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    user: data.user,
    isAuthenticated: true,
  }));
  localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
  localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify({
    orgId: data.orgId,
    orgName: data.orgName,
  }));
}

/**
 * Retrieves stored authentication state
 */
export function getStoredAuth(): AuthState {
  if (typeof window === 'undefined') {
    return {
      isAuthenticated: false,
      user: null,
      orgId: null,
      orgName: null,
      token: null,
    };
  }

  try {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const orgData = localStorage.getItem(ORG_STORAGE_KEY);

    if (!authData || !token) {
      return {
        isAuthenticated: false,
        user: null,
        orgId: null,
        orgName: null,
        token: null,
      };
    }

    const auth = JSON.parse(authData);
    const org = orgData ? JSON.parse(orgData) : { orgId: null, orgName: null };

    return {
      isAuthenticated: true,
      user: auth.user,
      orgId: org.orgId,
      orgName: org.orgName,
      token,
    };
  } catch {
    return {
      isAuthenticated: false,
      user: null,
      orgId: null,
      orgName: null,
      token: null,
    };
  }
}

/**
 * Clears all authentication data
 */
export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(ORG_STORAGE_KEY);
}

/**
 * Gets the current auth token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Gets the current org ID
 */
export function getCurrentOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const orgData = localStorage.getItem(ORG_STORAGE_KEY);
    if (orgData) {
      const org = JSON.parse(orgData);
      return org.orgId;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Validates if current session is still valid
 * Can be extended to verify token with backend
 */
export function isSessionValid(): boolean {
  const auth = getStoredAuth();
  return auth.isAuthenticated && !!auth.token;
}

// Legacy support - kept for backwards compatibility during transition
export const ADMIN_ID = "connectnowadmin";
export const ADMIN_PASSWORD = "connectnow2025admintest";

export function validateCredentials({ id, password }: { id: string; password: string }): boolean {
  return id === ADMIN_ID && password === ADMIN_PASSWORD;
}
