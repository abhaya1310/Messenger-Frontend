// API helper functions for frontend
// All API calls go directly to the backend using NEXT_PUBLIC_BACKEND_URL
// This allows frontend and backend to be deployed separately
import { config } from './config';

const API_BASE = config.apiUrl;

/**
 * Creates a fetch request with improved error handling
 * Includes the attempted URL in error messages for debugging
 */
async function fetchWithErrorHandling(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  const urlString = typeof url === 'string' ? url : url.toString();
  
  // Log the URL being requested (only in development or when debugging)
  if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || window.location.search.includes('debug=true'))) {
    console.log(`[API] Fetching: ${urlString}`);
  }

  try {
    const response = await fetch(urlString, options);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}\n` +
        `URL: ${urlString}\n` +
        `Response: ${errorText}`
      );
    }
    
    return response;
  } catch (error) {
    // Enhance error message with URL context
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
      const isCorsLikely = typeof window !== 'undefined' && 
        !urlString.startsWith(window.location.origin) &&
        (urlString.startsWith('http://') || urlString.startsWith('https://'));
      
      let errorMessage = `Network request failed. This usually indicates:\n` +
        `1. Backend server is not reachable at: ${urlString}\n` +
        `2. CORS is not configured on the backend\n` +
        `3. Network connectivity issues\n\n` +
        `Please verify:\n` +
        `- NEXT_PUBLIC_BACKEND_URL is set correctly: ${API_BASE}\n` +
        `- Backend server is running and accessible\n`;
      
      if (isCorsLikely) {
        errorMessage += `\n⚠️ CORS CONFIGURATION REQUIRED:\n` +
          `Your backend at ${API_BASE} must allow CORS requests from:\n` +
          `  Origin: ${frontendOrigin}\n\n` +
          `Backend CORS configuration should include:\n` +
          `  Access-Control-Allow-Origin: ${frontendOrigin}\n` +
          `  Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS\n` +
          `  Access-Control-Allow-Headers: Content-Type, X-ADMIN-TOKEN, X-ORG-ID\n`;
      } else {
        errorMessage += `- Backend CORS allows requests from: ${frontendOrigin}`;
      }
      
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export interface Template {
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED';
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  language: string;
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'FLOW';
      text: string;
      url?: string;
      phone_number?: string;
      flow_id?: string;
      flow_name?: string;
      flow_action?: string;
      navigate_screen?: string;
    }>;
  }>;
  created_time: string;
  modified_time: string;
}

export interface TemplateVariable {
  index: number;
  type: 'text' | 'date' | 'currency' | 'url';
  context: string;
  label: string;
}

export interface TemplateAnalysis {
  variableCount: number;
  variables: TemplateVariable[];
  templateStructure: {
    header?: string;
    body?: string;
    footer?: string;
  };
}

export interface CsvAnalysis {
  columns: string[];
  samples: Record<string, string[]>;
  suggestions: Record<number, string>;
  confidence: Record<number, number>;
  preview: string[];
  validation: {
    columnCount: number;
    variableCount: number;
    status: 'insufficient' | 'equal' | 'excess' | 'unknown';
    phoneColumnDetected: Array<{column: string; confidence: number}>;
    message: string;
  };
}

export interface ColumnSuggestion {
  column: string;
  confidence: number;
  reason: string;
}

export interface AnalyticsData {
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  archivedConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  totalSent: number;
  deliveryRate: number;
  totalDelivered: number;
  responseRate: number;
  readRate: number;
  totalRead: number;
}

export interface Conversation {
  _id: string;
  clientPhoneNumber: string;
  whatsappPhoneNumberId: string;
  status: 'active' | 'closed' | 'archived';
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  metadata?: {
    clientName?: string;
    company?: string;
    tags?: string[];
    notes?: string;
    flagged?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  whatsappMessageId: string;
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';
  content: {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    fileSize?: number;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    contact?: {
      name: string;
      phoneNumber: string;
    };
    template?: {
      name: string;
      language: string;
      parameters?: string[];
      flowId?: string;
      flowName?: string;
    };
  };
  status: 'sent' | 'delivered' | 'read' | 'failed';
  statusTimestamp: string;
  timestamp: string;
  clientPhoneNumber: string;
  whatsappPhoneNumberId: string;
  metadata?: {
    originalMessageId?: string;
    isReply?: boolean;
    replyToMessageId?: string;
    isForwarded?: boolean;
    forwardedFrom?: string;
    errorCode?: string;
    errorMessage?: string;
    errorType?: 'quality_policy' | 'technical';
    retryCount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  totalConversations: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    skip: number;
    total: number;
  };
}

export interface ConversationHistoryResponse {
  conversation: Conversation;
  messages: Message[];
  totalMessages: number;
  hasMore: boolean;
}

export async function fetchTemplates(limit?: number): Promise<{ data: Template[] }> {
  // Ensure we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('fetchTemplates can only be called from the client side');
  }

  const url = new URL('/api/templates', API_BASE);
  if (limit) {
    url.searchParams.append('limit', limit.toString());
  }
  
  const res = await fetchWithErrorHandling(url.toString());
  return res.json();
}

export async function analyzeTemplate(templateName: string): Promise<{ templateName: string; analysis: TemplateAnalysis }> {
  if (typeof window === 'undefined') {
    throw new Error('analyzeTemplate can only be called from the client side');
  }

  const res = await fetchWithErrorHandling(`${API_BASE}/api/templates/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ADMIN-TOKEN': config.adminToken,
    },
    body: JSON.stringify({ templateName }),
  });
  
  return res.json();
}

export async function analyzeCsv(file: File, templateName?: string): Promise<CsvAnalysis> {
  if (typeof window === 'undefined') {
    throw new Error('analyzeCsv can only be called from the client side');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (templateName) {
    formData.append('templateName', templateName);
  }
  
  const res = await fetchWithErrorHandling(`${API_BASE}/api/csv/analyze`, {
    method: 'POST',
    headers: {
      'X-ADMIN-TOKEN': config.adminToken,
    },
    body: formData,
  });
  
  return res.json();
}

export async function fetchAnalytics(params?: Record<string, string>): Promise<AnalyticsData> {
  if (typeof window === 'undefined') {
    throw new Error('fetchAnalytics can only be called from the client side');
  }

  const url = new URL('/api/analytics', API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  const res = await fetchWithErrorHandling(url.toString());
  return res.json();
}

export async function exportAnalytics(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('exportAnalytics can only be called from the client side');
  }

  const res = await fetchWithErrorHandling(`${API_BASE}/api/analytics/export`, {
    headers: {
      'X-ADMIN-TOKEN': config.adminToken,
    },
  });
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analytics.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// New Analytics Endpoints (multitenant)
export async function fetchTemplatesAnalytics(params: { language?: string; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchTemplatesAnalytics can only be called from the client side');
  }

  const url = new URL('/analytics/templates', API_BASE);
  if (params.language) url.searchParams.set('language', params.language);
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetchWithErrorHandling(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  return res.json();
}

export async function fetchAnalyticsSummary(params: { start?: string; end?: string; language?: string; granularity?: 'auto'|'hour'|'day'; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchAnalyticsSummary can only be called from the client side');
  }

  const url = new URL('/analytics/summary', API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetchWithErrorHandling(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  return res.json();
}

export async function fetchTemplateSeries(name: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto'|'hour'|'day'; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchTemplateSeries can only be called from the client side');
  }

  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/series`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetchWithErrorHandling(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  return res.json();
}

export async function fetchTemplateVariables(name: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto'|'hour'|'day'; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchTemplateVariables can only be called from the client side');
  }

  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/variables`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetchWithErrorHandling(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  return res.json();
}

export async function fetchTopValues(name: string, variable: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto'|'hour'|'day'; limit?: number; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchTopValues can only be called from the client side');
  }

  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/variables/${encodeURIComponent(variable)}/top`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetchWithErrorHandling(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  return res.json();
}

export async function sendFeedbackCsv(
  file: File,
  templateName?: string,
  language?: string,
  dryRun?: boolean
): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('sendFeedbackCsv can only be called from the client side');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (templateName) formData.append('templateName', templateName);
  if (language) formData.append('language', language);
  if (dryRun !== undefined) formData.append('dryRun', dryRun.toString());

  const res = await fetchWithErrorHandling(`${API_BASE}/send-feedback-csv`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-ADMIN-TOKEN': config.adminToken,
    },
  });

  return res.json();
}

export async function sendTemplateDynamic(
  to: string,
  templateName: string,
  columnMapping: Record<number, string>,
  row: Record<string, string>,
  languageCode: string = 'en_US',
  mediaId?: string
): Promise<{ messageId: string; payload: any }> {
  if (typeof window === 'undefined') {
    throw new Error('sendTemplateDynamic can only be called from the client side');
  }

  try {
    const res = await fetchWithErrorHandling(`${API_BASE}/api/send-template-dynamic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ADMIN-TOKEN': config.adminToken,
      },
      body: JSON.stringify({
        to,
        templateName,
        columnMapping,
        row,
        languageCode,
        mediaId
      }),
    });

    return res.json();
  } catch (error) {
    // Try to extract more detailed error information if available
    if (error instanceof Error && error.message.includes('API request failed')) {
      // Error already enhanced by fetchWithErrorHandling
      throw error;
    }
    
    // Fallback error handling
    throw new Error(`Failed to send template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Monitor Tab API Functions

export async function fetchConversations(params: {
  limit?: number;
  skip?: number;
  status?: 'active' | 'closed' | 'archived' | ('active' | 'closed' | 'archived')[];
  startDate?: string;
  endDate?: string;
  company?: string;
  tags?: string[];
  sortBy?: 'startedAt' | 'lastMessageAt' | 'messageCount';
  sortOrder?: 'asc' | 'desc';
}): Promise<ConversationsResponse> {
  if (typeof window === 'undefined') {
    throw new Error('fetchConversations can only be called from the client side');
  }

  const url = new URL('/conversations', API_BASE);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else {
        url.searchParams.append(key, value.toString());
      }
    }
  });
  
  const res = await fetchWithErrorHandling(url.toString(), {
    headers: {
      'X-ADMIN-TOKEN': config.adminToken,
    },
  });
  
  const data: ConversationsResponse = await res.json();
  
  // Defensive deduplication: remove duplicates by _id
  if (data.conversations && Array.isArray(data.conversations)) {
    const seen = new Set<string>();
    data.conversations = data.conversations.filter(conv => {
      const id = String(conv._id);
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }
  
  return data;
}

export async function fetchConversationMessages(
  phoneNumber: string,
  params: { 
    limit?: number; 
    skip?: number; 
    startDate?: string; 
    endDate?: string;
    direction?: 'inbound' | 'outbound';
  }
): Promise<ConversationHistoryResponse> {
  if (typeof window === 'undefined') {
    throw new Error('fetchConversationMessages can only be called from the client side');
  }

  const url = new URL(`/conversations/${encodeURIComponent(phoneNumber)}/messages`, API_BASE);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });
  
  const res = await fetchWithErrorHandling(url.toString(), {
    headers: {
      'X-ADMIN-TOKEN': config.adminToken,
    },
  });
  
  return res.json();
}

export async function updateConversationMetadata(
  phoneNumber: string,
  metadata: { 
    clientName?: string; 
    company?: string; 
    tags?: string[]; 
    notes?: string; 
    flagged?: boolean 
  }
): Promise<Conversation> {
  if (typeof window === 'undefined') {
    throw new Error('updateConversationMetadata can only be called from the client side');
  }

  const res = await fetchWithErrorHandling(`${API_BASE}/conversations/${encodeURIComponent(phoneNumber)}/metadata`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-ADMIN-TOKEN': config.adminToken,
    },
    body: JSON.stringify(metadata),
  });
  
  return res.json();
}

export async function sendTextMessage(
  to: string,
  text: string,
  contextMessageId?: string
): Promise<{ messageId: string }> {
  if (typeof window === 'undefined') {
    throw new Error('sendTextMessage can only be called from the client side');
  }

  const res = await fetchWithErrorHandling(`${API_BASE}/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      text,
      contextMessageId,
    }),
  });
  
  return res.json();
}
