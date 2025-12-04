"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OrgContextType {
  orgId: string | null;
  orgName: string | null;
  setOrg: (orgId: string, orgName: string) => void;
  clearOrg: () => void;
}

const OrgContext = createContext<OrgContextType | null>(null);

const ORG_STORAGE_KEY = 'connectnow_org';

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ORG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOrgId(parsed.orgId);
        setOrgName(parsed.orgName);
      } catch (e) {
        console.error('Failed to parse stored org data:', e);
        localStorage.removeItem(ORG_STORAGE_KEY);
      }
    }
  }, []);

  const setOrg = (newOrgId: string, newOrgName: string) => {
    setOrgId(newOrgId);
    setOrgName(newOrgName);
    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify({ orgId: newOrgId, orgName: newOrgName }));
  };

  const clearOrg = () => {
    setOrgId(null);
    setOrgName(null);
    localStorage.removeItem(ORG_STORAGE_KEY);
  };

  return (
    <OrgContext.Provider value={{ orgId, orgName, setOrg, clearOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}

// Helper function for API calls (can be used outside React components)
export function getCurrentOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(ORG_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.orgId;
    } catch {
      return null;
    }
  }
  return null;
}

// Helper function for getting auth token
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('connectnow_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('connectnow_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('connectnow_token');
}

