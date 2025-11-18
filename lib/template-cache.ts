// Global template cache utility
// This ensures templates are cached across all pages and components

import { Template } from './api';

const TEMPLATE_CACHE_KEY = 'whatsapp_templates_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface CachedTemplates {
  data: Template[];
  timestamp: number;
}

export const getTemplatesFromCache = (): Template[] | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(TEMPLATE_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedTemplates = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - parsed.timestamp > CACHE_DURATION) {
      console.log('Template cache expired, clearing...');
      sessionStorage.removeItem(TEMPLATE_CACHE_KEY);
      return null;
    }
    
    // Validate that we have valid template data
    if (!parsed.data || !Array.isArray(parsed.data)) {
      console.warn('Template cache contains invalid data, clearing...');
      sessionStorage.removeItem(TEMPLATE_CACHE_KEY);
      return null;
    }
    
    console.log(`Template cache hit - using ${parsed.data.length} cached templates`);
    return parsed.data;
  } catch (error) {
    console.warn('Template cache corrupted, clearing...', error);
    sessionStorage.removeItem(TEMPLATE_CACHE_KEY);
    return null;
  }
};

export const setTemplatesCache = (templates: Template[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData: CachedTemplates = {
      data: templates,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem(TEMPLATE_CACHE_KEY, JSON.stringify(cacheData));
    console.log('Template cache updated with', templates.length, 'templates');
  } catch (error) {
    console.warn('Failed to update template cache:', error);
  }
};

export const clearTemplatesCache = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TEMPLATE_CACHE_KEY);
  console.log('Template cache cleared');
};

export const isCacheValid = (): boolean => {
  const cached = getTemplatesFromCache();
  return cached !== null;
};

export const getCacheInfo = (): { isValid: boolean; count: number; age: number } => {
  if (typeof window === 'undefined') return { isValid: false, count: 0, age: 0 };
  
  try {
    const cached = sessionStorage.getItem(TEMPLATE_CACHE_KEY);
    if (!cached) return { isValid: false, count: 0, age: 0 };
    
    const parsed: CachedTemplates = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    const isValid = age < CACHE_DURATION;
    
    return {
      isValid,
      count: parsed.data.length,
      age: Math.floor(age / 1000) // age in seconds
    };
  } catch {
    return { isValid: false, count: 0, age: 0 };
  }
};
