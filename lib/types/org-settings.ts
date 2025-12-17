// Organization Settings Types

export interface OrgServices {
  posIntegration: {
    enabled: boolean;
    syncFrequency: 'realtime' | 'hourly' | 'daily';
  };
  feedback: {
    enabled: boolean;
    autoSendAfterTransaction: boolean;
    delayMinutes: number;
  };
  billMessaging: {
    enabled: boolean;
    autoSend: boolean;
  };
  eventCampaigns: {
    enabled: boolean;
    maxPerMonth?: number;
  };
  autoCampaigns: {
    enabled: boolean;
    allowedTriggers: string[];
  };
  loyalty: {
    enabled: boolean;
  };
}

export interface OrgSettings {
  orgId: string;
  orgName: string;
  services: OrgServices;
  whatsapp: {
    phoneNumberId: string;
    defaultLanguage: string;
  };
  timezone: string;
  posApiCredentials?: {
    apiKey: string; // Partial, masked
    isActive: boolean;
    createdAt: string;
    lastUsedAt?: string;
  };
}

export interface ServiceUpdate {
  service: 'posIntegration' | 'feedback' | 'billMessaging' | 'eventCampaigns' | 'autoCampaigns' | 'loyalty';
  enabled: boolean;
  config?: Record<string, unknown>;
}

// User & Auth Types
export interface User {
  id?: string;
  _id?: string;
  email: string;
  name?: string;
  username?: string;
  orgId: string;
  role: 'admin' | 'manager' | 'staff' | 'user';
  createdAt?: string;
}

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  orgId?: string;
  orgName?: string;
  token?: string;
  accessToken?: string;
  expiresInSeconds?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  orgId: string | null;
  orgName: string | null;
  token: string | null;
}

