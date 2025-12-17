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
  identifier: string;
  password: string;
}

export interface RegisterVerifyResponse {
  ok: boolean;
  orgName?: string;
  expiresAt?: string;
  error?: 'invalid_or_expired' | 'invalid_body' | string;
}

export interface RegisterCompleteResponse {
  success: boolean;
  error?: 'invalid_or_expired' | 'username_taken' | 'invalid_body' | string;
}

/**
 * Authenticates user against the backend API
 * Returns user info, orgId, and token on success
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const identifier = credentials.identifier.trim();
  const isEmail = identifier.includes('@');

  const attempt = async (body: Record<string, unknown>) => {
    return fetch(`${config.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  const primaryBody = isEmail
    ? ({ email: identifier, password: credentials.password } satisfies LoginRequest)
    : ({ username: identifier, password: credentials.password } satisfies LoginRequest);

  let response = await attempt(primaryBody);

  if (!response.ok && response.status === 401 && !isEmail) {
    const fallbackBody = ({ email: identifier, password: credentials.password } satisfies LoginRequest);
    response = await attempt(fallbackBody);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || error.error || 'Invalid credentials');
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
  const token = data.accessToken || data.token;
  const orgId = data.user?.orgId || data.orgId || null;
  const orgName = data.orgName || null;

  if (!token) {
    throw new Error('Login response did not include an access token');
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    user: data.user,
    isAuthenticated: true,
  }));
  localStorage.setItem(TOKEN_STORAGE_KEY, token);

  if (orgId) {
    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify({
      orgId,
      orgName,
    }));
  } else {
    localStorage.removeItem(ORG_STORAGE_KEY);
  }
}

export async function verifyRegistrationAccessCode(accessCode: string): Promise<RegisterVerifyResponse> {
  const response = await fetch(`${config.apiUrl}/api/auth/register/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessCode }),
  });

  if (response.status === 400) {
    return response.json().catch(() => ({ ok: false, error: 'invalid_body' }));
  }

  if (!response.ok) {
    throw new Error('Failed to verify access code');
  }

  return response.json();
}

export async function validateSessionWithMeEndpoint(token: string): Promise<boolean> {
  const response = await fetch(`${config.apiUrl}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return false;
  }

  return true;
}

export async function fetchMe(token: string): Promise<User | null> {
  const response = await fetch(`${config.apiUrl}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!data) return null;

  const user = (data as { user?: unknown }).user;
  if (!user || typeof user !== 'object') return null;
  return user as User;
}

export async function completeRegistrationAccessCode(payload: { accessCode: string; password: string; username?: string }): Promise<RegisterCompleteResponse> {
  const response = await fetch(`${config.apiUrl}/api/auth/register/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 400 || response.status === 409) {
    return response.json().catch(() => ({ success: false, error: 'invalid_body' }));
  }

  if (!response.ok) {
    throw new Error('Failed to complete registration');
  }

  return response.json();
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
