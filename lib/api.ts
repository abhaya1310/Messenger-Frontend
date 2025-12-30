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
      const err: any = new Error(
        `API request failed: ${response.status} ${response.statusText}\n` +
        `URL: ${urlString}\n` +
        `Response: ${errorText}`
      );
      err.status = response.status;
      err.payload = errorText;
      throw err;
    }

    return response;
  } catch (error) {
    // Enhance error message with URL context
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
      const isCorsLikely = typeof window !== 'undefined' &&
        !urlString.startsWith(window.location.origin) &&
        (urlString.startsWith('http://') || urlString.startsWith('https://'));

      let errorMessage = `Cannot connect to backend at ${API_BASE}.\n\n` +
        `This is likely a CORS (Cross-Origin Resource Sharing) issue.\n\n` +
        `Your backend at ${API_BASE} must allow requests from your frontend origin:\n` +
        `  Frontend Origin: ${frontendOrigin}\n\n` +
        `To fix this, configure CORS on your backend to allow requests from:\n` +
        `  ${frontendOrigin}\n\n` +
        `Backend CORS configuration should include:\n` +
        `  Access-Control-Allow-Origin: ${frontendOrigin} (or * for development)\n` +
        `  Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS\n` +
        `  Access-Control-Allow-Headers: Content-Type, X-ORG-ID\n\n` +
        `If you're using Express.js, add:\n` +
        `  app.use(cors({ origin: '${frontendOrigin}' }));\n\n` +
        `Or set FRONTEND_URL environment variable in your backend to: ${frontendOrigin}`;

      throw new Error(errorMessage);
    }
    throw error;
  }
}

type ApiError = Error & {
  status?: number;
  reasonCode?: string;
  details?: unknown;
  payload?: unknown;
};

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(res: Response, payload: unknown, fallbackMessage: string): ApiError {
  const p: any = payload;
  const reasonCode = p?.reasonCode || p?.error?.code || p?.errorCode;
  const message =
    p?.error?.message ||
    p?.message ||
    (typeof p?.error === "string" ? p.error : undefined) ||
    (typeof reasonCode === "string" ? reasonCode : undefined) ||
    fallbackMessage;

  const err = new Error(message) as ApiError;
  err.status = res.status;
  err.reasonCode = reasonCode;
  err.details = p?.error?.details || p?.details;
  err.payload = payload;
  return err;
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

// Shared analytics and mapping types (single source of truth)
import type {
  TemplateVariable,
  TemplateAnalysis,
  CsvAnalysis,
  ColumnSuggestion,
} from './types/mapping';

export type { TemplateVariable, TemplateAnalysis, CsvAnalysis, ColumnSuggestion };

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
  throw new Error('Templates are admin-only. Use the Admin portal (/admin/templates).');
}

export async function analyzeTemplate(templateName: string): Promise<{ templateName: string; analysis: TemplateAnalysis }> {
  throw new Error('Templates are admin-only. Use the Admin portal (/admin/templates).');
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

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(`${API_BASE}/api/csv/analyze`, {
    method: 'POST',
    body: formData,
    headers,
  });

  return res.json();
}

function unwrapApiResponse<T>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as any).data as T;
  }
  return value as T;
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

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(url.toString(), { headers });
  return res.json();
}

export async function exportAnalytics(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('exportAnalytics can only be called from the client side');
  }

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(`${API_BASE}/api/analytics/export`, { headers });

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
  const orgId = params.orgId || getCurrentOrgId() || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(url.toString(), { headers });
  return res.json();
}

export async function fetchAnalyticsSummary(params: { start?: string; end?: string; language?: string; granularity?: 'auto' | 'hour' | 'day'; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchAnalyticsSummary can only be called from the client side');
  }

  const url = new URL('/analytics/summary', API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || getCurrentOrgId() || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(url.toString(), { headers });
  return res.json();
}

export async function fetchTemplateSeries(name: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto' | 'hour' | 'day'; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchTemplateSeries can only be called from the client side');
  }

  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/series`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || getCurrentOrgId() || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(url.toString(), { headers });
  return res.json();
}

export async function fetchTemplateVariables(name: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto' | 'hour' | 'day'; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchTemplateVariables can only be called from the client side');
  }

  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/variables`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || getCurrentOrgId() || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(url.toString(), { headers });
  return res.json();
}

export async function fetchTopValues(name: string, variable: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto' | 'hour' | 'day'; limit?: number; orgId?: string }) {
  if (typeof window === 'undefined') {
    throw new Error('fetchTopValues can only be called from the client side');
  }

  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/variables/${encodeURIComponent(variable)}/top`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || getCurrentOrgId() || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(url.toString(), { headers });
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

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(`${API_BASE}/send-feedback-csv`, {
    method: 'POST',
    body: formData,
    headers,
  });

  return res.json();
}

export async function sendTemplateDynamic(
  to: string,
  templateName: string,
  columnMapping: Record<number, string>,
  row: Record<string, string>,
  languageCode: string = 'en_US',
  mediaId?: string,
  campaignId?: string
): Promise<{ messageId: string; payload: any }> {
  if (typeof window === 'undefined') {
    throw new Error('sendTemplateDynamic can only be called from the client side');
  }

  try {
    const payload: {
      to: string;
      templateName: string;
      columnMapping: Record<number, string>;
      row: Record<string, string>;
      languageCode: string;
      mediaId?: string;
      campaignId?: string;
    } = {
      to,
      templateName,
      columnMapping,
      row,
      languageCode,
    };

    if (mediaId) {
      payload.mediaId = mediaId;
    }

    if (campaignId) {
      payload.campaignId = campaignId;
    }

    const orgId = getCurrentOrgId();
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!token && orgId) headers['X-ORG-ID'] = orgId;

    const res = await fetchWithErrorHandling(`${API_BASE}/api/send-template-dynamic`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetch(url.toString(), { headers });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.assign('/login?reason=session_expired');
    }
  }
  const payload = await parseJsonSafe(res);
  if (!res.ok) {
    throw toApiError(res, payload, 'Failed to load conversations');
  }

  const data: ConversationsResponse = payload as ConversationsResponse;

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

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetch(url.toString(), { headers });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.assign('/login?reason=session_expired');
    }
  }
  const payload = await parseJsonSafe(res);
  if (!res.ok) {
    throw toApiError(res, payload, 'Failed to load messages');
  }

  return payload as ConversationHistoryResponse;
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

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(phoneNumber)}/metadata`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(metadata),
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.assign('/login?reason=session_expired');
    }
  }

  const payload = await parseJsonSafe(res);
  if (!res.ok) {
    throw toApiError(res, payload, 'Failed to update metadata');
  }

  return payload as Conversation;
}

export async function sendTextMessage(
  to: string,
  text: string,
  contextMessageId?: string
): Promise<{ messageId: string }> {
  if (typeof window === 'undefined') {
    throw new Error('sendTextMessage can only be called from the client side');
  }

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetchWithErrorHandling(`${API_BASE}/send-text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to,
      text,
      contextMessageId,
    }),
  });

  return res.json();
}

// ============================================================================
// POS & Campaign API Functions
// ============================================================================

import { getCurrentOrgId, getAuthToken, clearAuth } from './auth';
import type {
  POSCustomer,
  CustomerListParams,
  CustomerListResponse,
  CustomerDetail,
  TransactionListResponse,
  SyncStatus,
} from './types/pos';
import type {
  Campaign,
  CampaignListParams,
  CampaignListResponse,
  CreateCampaignRequest,
  AudiencePreviewResponse,
  // New campaign config types
  CampaignConfig,
  BirthdayConfig,
  AnniversaryConfig,
  FirstVisitConfig,
  WinbackConfig,
  WinbackTier,
  FestivalConfig,
  UtilityConfig,
  // New analytics types
  DashboardOverview,
  CampaignStats,
  AutoCampaignStats,
  TemplateStats,
  TemplatePerformance,
  SegmentCounts,
  SegmentFilter,
  AudiencePreviewResult,
  // Legacy types (deprecated)
  AutoCampaign,
  CreateAutoCampaignRequest,
  CampaignAnalytics,
  CustomerAnalytics,
} from './types/campaign';
import type {
  OrgSettings,
  ServiceUpdate,
} from './types/org-settings';

/**
 * Generic API client with automatic org and auth headers
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (typeof window === 'undefined') {
    throw new Error('apiClient can only be called from the client side');
  }

  const orgId = getCurrentOrgId();
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (orgId) {
    headers['X-ORG-ID'] = orgId;
  }

  // Also include admin token for backwards compatibility

  try {
    const res = await fetchWithErrorHandling(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    return res.json();
  } catch (e: any) {
    if (e?.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.assign('/login?reason=session_expired');
      }
    }
    throw e;
  }
}

// ============================================================================
// POS Customer API Functions
// ============================================================================

/**
 * Fetch list of POS customers with pagination and filters
 */
export async function fetchCustomers(params: CustomerListParams = {}): Promise<CustomerListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.filters?.hasEmail !== undefined) searchParams.set('hasEmail', params.filters.hasEmail.toString());
  if (params.filters?.hasBirthday !== undefined) searchParams.set('hasBirthday', params.filters.hasBirthday.toString());
  if (params.filters?.minVisits) searchParams.set('minVisits', params.filters.minVisits.toString());
  if (params.filters?.daysSinceLastVisit) searchParams.set('daysSinceLastVisit', params.filters.daysSinceLastVisit.toString());

  const queryString = searchParams.toString();
  return apiClient<CustomerListResponse>(`/api/pos/customers${queryString ? `?${queryString}` : ''}`);
}

/**
 * Fetch single customer detail with transactions and campaign history
 */
export async function fetchCustomerDetail(customerId: string): Promise<CustomerDetail> {
  return apiClient<CustomerDetail>(`/api/pos/customers/${customerId}`);
}

/**
 * Fetch customer transactions
 */
export async function fetchCustomerTransactions(
  customerId: string,
  params: { page?: number; limit?: number } = {}
): Promise<TransactionListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  return apiClient<TransactionListResponse>(
    `/api/pos/customers/${customerId}/transactions${queryString ? `?${queryString}` : ''}`
  );
}

/**
 * Fetch POS sync status
 */
export async function fetchSyncStatus(): Promise<SyncStatus> {
  return apiClient<SyncStatus>('/api/pos/sync/status');
}

// ============================================================================
// Campaign API Functions
// ============================================================================

/**
 * Fetch list of campaigns
 */
export async function fetchCampaigns(params: CampaignListParams = {}): Promise<CampaignListResponse> {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set('status', params.status);
  if (params.type) searchParams.set('type', params.type);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  const raw = await apiClient<any>(`/api/campaigns${queryString ? `?${queryString}` : ''}`);
  const data = unwrapApiResponse<any>(raw);

  if (data && typeof data === 'object' && Array.isArray((data as any).campaigns)) {
    return {
      campaigns: (data as any).campaigns as Campaign[],
      pagination: (data as any).pagination,
    };
  }

  if (Array.isArray(data)) {
    return { campaigns: data as Campaign[] };
  }

  return { campaigns: [] };
}

/**
 * Fetch single campaign by ID
 */
export async function fetchCampaign(campaignId: string): Promise<Campaign> {
  const raw = await apiClient<any>(`/api/campaign-runs/${campaignId}`);
  return unwrapApiResponse<Campaign>(raw);
}

/**
 * Create a new campaign
 */
export async function createCampaign(data: CreateCampaignRequest): Promise<Campaign> {
  const raw = await apiClient<any>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return unwrapApiResponse<Campaign>(raw);
}

/**
 * Update a campaign
 */
export async function updateCampaign(campaignId: string, data: Partial<CreateCampaignRequest>): Promise<Campaign> {
  const raw = await apiClient<any>(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  return unwrapApiResponse<Campaign>(raw);
}

/**
 * Delete a campaign (draft only)
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  await apiClient<void>(`/api/campaigns/${campaignId}`, {
    method: 'DELETE',
  });
}

/**
 * Preview audience for campaign filters
 */
export async function previewAudience(filters: {
  minVisits?: number;
  maxDaysSinceLastVisit?: number;
  minTotalSpend?: number;
  outlets?: string[];
}): Promise<AudiencePreviewResponse> {
  return apiClient<AudiencePreviewResponse>('/api/campaigns/preview-audience', {
    method: 'POST',
    body: JSON.stringify({ filters }),
  });
}

/**
 * Schedule a campaign
 */
export async function scheduleCampaign(campaignId: string): Promise<Campaign> {
  return apiClient<Campaign>(`/api/campaigns/${campaignId}/schedule`, {
    method: 'POST',
  });
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(campaignId: string): Promise<Campaign> {
  return apiClient<Campaign>(`/api/campaigns/${campaignId}/pause`, {
    method: 'POST',
  });
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(campaignId: string): Promise<Campaign> {
  return apiClient<Campaign>(`/api/campaigns/${campaignId}/resume`, {
    method: 'POST',
  });
}

/**
 * Cancel a campaign
 */
export async function cancelCampaign(campaignId: string): Promise<Campaign> {
  return apiClient<Campaign>(`/api/campaigns/${campaignId}/cancel`, {
    method: 'POST',
  });
}

// ============================================================================
// Campaign Configuration API Functions (Config-Based Auto Campaigns)
// ============================================================================

/**
 * Fetch campaign configuration for the organization
 */
export async function fetchCampaignConfig(): Promise<CampaignConfig> {
  const response = await apiClient<{ success: boolean; data: CampaignConfig }>('/api/campaign-config');
  return response.data;
}

/**
 * Update campaign configuration (partial update)
 */
export async function updateCampaignConfig(updates: Partial<CampaignConfig>): Promise<CampaignConfig> {
  const response = await apiClient<{ success: boolean; data: CampaignConfig }>('/api/campaign-config', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.data;
}

/**
 * Update birthday campaign configuration
 */
export async function updateBirthdayConfig(updates: Partial<BirthdayConfig>): Promise<BirthdayConfig> {
  const response = await apiClient<{ success: boolean; data: BirthdayConfig }>('/api/campaign-config/birthday', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.data;
}

/**
 * Update anniversary campaign configuration
 */
export async function updateAnniversaryConfig(updates: Partial<AnniversaryConfig>): Promise<AnniversaryConfig> {
  const response = await apiClient<{ success: boolean; data: AnniversaryConfig }>('/api/campaign-config/anniversary', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.data;
}

/**
 * Update first visit campaign configuration
 */
export async function updateFirstVisitConfig(updates: Partial<FirstVisitConfig>): Promise<FirstVisitConfig> {
  const response = await apiClient<{ success: boolean; data: FirstVisitConfig }>('/api/campaign-config/first-visit', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.data;
}

/**
 * Update winback campaign configuration
 */
export async function updateWinbackConfig(updates: Partial<WinbackConfig>): Promise<WinbackConfig> {
  const response = await apiClient<{ success: boolean; data: WinbackConfig }>('/api/campaign-config/winback', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.data;
}

/**
 * Add a new winback tier
 */
export async function addWinbackTier(tier: Omit<WinbackTier, 'enabled'> & { enabled?: boolean }): Promise<WinbackConfig> {
  const response = await apiClient<{ success: boolean; data: WinbackConfig }>('/api/campaign-config/winback/tiers', {
    method: 'POST',
    body: JSON.stringify(tier),
  });
  return response.data;
}

/**
 * Remove a winback tier by days
 */
export async function removeWinbackTier(days: number): Promise<WinbackConfig> {
  const response = await apiClient<{ success: boolean; data: WinbackConfig }>(`/api/campaign-config/winback/tiers/${days}`, {
    method: 'DELETE',
  });
  return response.data;
}

/**
 * Add a new festival campaign
 */
export async function addFestival(festival: Omit<FestivalConfig, 'id'>): Promise<FestivalConfig[]> {
  const response = await apiClient<{ success: boolean; data: FestivalConfig[] }>('/api/campaign-config/festivals', {
    method: 'POST',
    body: JSON.stringify(festival),
  });
  return response.data;
}

/**
 * Update an existing festival campaign
 */
export async function updateFestival(id: string, updates: Partial<FestivalConfig>): Promise<FestivalConfig[]> {
  const response = await apiClient<{ success: boolean; data: FestivalConfig[] }>(`/api/campaign-config/festivals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.data;
}

/**
 * Delete a festival campaign
 */
export async function deleteFestival(id: string): Promise<FestivalConfig[]> {
  const response = await apiClient<{ success: boolean; data: FestivalConfig[] }>(`/api/campaign-config/festivals/${id}`, {
    method: 'DELETE',
  });
  return response.data;
}

/**
 * Update utility messaging configuration
 */
export async function updateUtilityConfig(
  updates: Partial<UtilityConfig>,
  opts?: { defaultLanguage?: string }
): Promise<UtilityConfig> {
  if (typeof window === 'undefined') {
    throw new Error('updateUtilityConfig can only be called from the client side');
  }

  const payloadUpdates: any = structuredClone(updates as any);
  const fb = payloadUpdates?.feedback;
  if (fb && typeof fb === 'object') {
    if ('delayMinutes' in fb) {
      const raw = (fb as any).delayMinutes;
      const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? '').trim(), 10);
      if (Number.isFinite(parsed)) {
        (fb as any).delayMinutes = Math.max(1, Math.trunc(parsed));
      } else {
        delete (fb as any).delayMinutes;
      }
    }
    if (!fb.campaignDefinitionId && fb.definitionId) {
      fb.campaignDefinitionId = fb.definitionId;
    }
    if ('definitionId' in fb) {
      delete fb.definitionId;
    }
  }

  const orgId = getCurrentOrgId();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['X-ORG-ID'] = orgId;

  const res = await fetch(`${API_BASE}/api/campaign-config`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      utility: payloadUpdates,
      ...(opts?.defaultLanguage ? { defaultLanguage: opts.defaultLanguage } : {}),
    }),
  });

  const payload = await parseJsonSafe(res);
  if (!res.ok) {
    throw toApiError(res, payload, 'Failed to update config');
  }

  const p: any = payload;
  const data = p?.data;
  const utility = data?.utility ?? data;
  return utility as UtilityConfig;
}

/**
 * Preview audience count based on segment filters
 */
export async function previewAudienceCount(filter: SegmentFilter): Promise<AudiencePreviewResult> {
  const response = await apiClient<{ success: boolean; data: AudiencePreviewResult }>('/api/campaign-config/preview', {
    method: 'POST',
    body: JSON.stringify(filter),
  });
  return response.data;
}

// ============================================================================
// New Analytics API Functions
// ============================================================================

/**
 * Fetch dashboard overview analytics
 */
export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const response = await apiClient<{ success: boolean; data: DashboardOverview }>('/api/analytics/overview');
  return response.data;
}

/**
 * Fetch campaign stats by type
 */
export async function fetchCampaignStatsByType(params?: { type?: string; days?: number }): Promise<Record<string, CampaignStats>> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.days) searchParams.set('days', params.days.toString());

  const queryString = searchParams.toString();
  const response = await apiClient<{ success: boolean; data: Record<string, CampaignStats> }>(
    `/api/analytics/campaigns${queryString ? `?${queryString}` : ''}`
  );
  return response.data;
}

/**
 * Fetch auto-campaign stats summary
 */
export async function fetchAutoCampaignStats(): Promise<AutoCampaignStats> {
  const response = await apiClient<{ success: boolean; data: AutoCampaignStats }>('/api/analytics/auto-campaigns');
  return response.data;
}

/**
 * Fetch template stats
 */
export async function fetchTemplateStatsNew(days?: number): Promise<TemplateStats[]> {
  const searchParams = new URLSearchParams();
  if (days) searchParams.set('days', days.toString());

  const queryString = searchParams.toString();
  const response = await apiClient<{ success: boolean; data: TemplateStats[] }>(
    `/api/analytics/templates${queryString ? `?${queryString}` : ''}`
  );
  return response.data;
}

/**
 * Fetch single template performance with timeseries
 */
export async function fetchTemplatePerformance(templateName: string, days?: number): Promise<TemplatePerformance> {
  const searchParams = new URLSearchParams();
  if (days) searchParams.set('days', days.toString());

  const queryString = searchParams.toString();
  const response = await apiClient<{ success: boolean; data: TemplatePerformance }>(
    `/api/analytics/templates/${encodeURIComponent(templateName)}${queryString ? `?${queryString}` : ''}`
  );
  return response.data;
}

/**
 * Fetch customer segment counts
 */
export async function fetchSegmentCounts(): Promise<SegmentCounts> {
  const response = await apiClient<{ success: boolean; data: SegmentCounts }>('/api/analytics/segments');
  return response.data;
}

// ============================================================================
// Legacy Auto Campaign API Functions (Deprecated - Use Campaign Config instead)
// ============================================================================

/**
 * @deprecated Use fetchCampaignConfig() instead
 * Fetch list of auto campaigns
 */
export async function fetchAutoCampaigns(): Promise<{ autoCampaigns: AutoCampaign[] }> {
  return apiClient<{ autoCampaigns: AutoCampaign[] }>('/api/auto-campaigns');
}

/**
 * @deprecated Use fetchCampaignConfig() instead
 * Fetch single auto campaign
 */
export async function fetchAutoCampaign(id: string): Promise<AutoCampaign> {
  return apiClient<AutoCampaign>(`/api/auto-campaigns/${id}`);
}

/**
 * @deprecated Use updateBirthdayConfig/updateWinbackConfig etc instead
 * Create an auto campaign
 */
export async function createAutoCampaign(data: CreateAutoCampaignRequest): Promise<AutoCampaign> {
  return apiClient<AutoCampaign>('/api/auto-campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * @deprecated Use updateBirthdayConfig/updateWinbackConfig etc instead
 * Update an auto campaign
 */
export async function updateAutoCampaign(id: string, data: Partial<CreateAutoCampaignRequest>): Promise<AutoCampaign> {
  return apiClient<AutoCampaign>(`/api/auto-campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * @deprecated Use updateBirthdayConfig with enabled: false instead
 * Delete an auto campaign
 */
export async function deleteAutoCampaign(id: string): Promise<void> {
  await apiClient<void>(`/api/auto-campaigns/${id}`, {
    method: 'DELETE',
  });
}

/**
 * @deprecated Use updateBirthdayConfig with enabled: true instead
 * Activate an auto campaign
 */
export async function activateAutoCampaign(id: string): Promise<AutoCampaign> {
  return apiClient<AutoCampaign>(`/api/auto-campaigns/${id}/activate`, {
    method: 'POST',
  });
}

/**
 * @deprecated Use updateBirthdayConfig with enabled: false instead
 * Pause an auto campaign
 */
export async function pauseAutoCampaign(id: string): Promise<AutoCampaign> {
  return apiClient<AutoCampaign>(`/api/auto-campaigns/${id}/pause`, {
    method: 'POST',
  });
}

// ============================================================================
// Organization Settings API Functions
// ============================================================================

/**
 * Fetch organization settings
 */
export async function fetchOrgSettings(orgId?: string): Promise<OrgSettings> {
  const id = orgId || getCurrentOrgId();
  if (!id) {
    throw new Error('Organization ID is required');
  }
  return apiClient<OrgSettings>(`/api/org-settings/${id}`);
}

/**
 * Update service configuration
 */
export async function updateServiceConfig(orgId: string, update: ServiceUpdate): Promise<OrgSettings> {
  return apiClient<OrgSettings>(`/api/org-settings/${orgId}/services`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
}

// ============================================================================
// Legacy Campaign & Customer Analytics API Functions (Deprecated)
// ============================================================================

/**
 * @deprecated Use fetchDashboardOverview() or fetchCampaignStatsByType() instead
 * Fetch campaign analytics
 */
export async function fetchCampaignAnalytics(): Promise<CampaignAnalytics> {
  return apiClient<CampaignAnalytics>('/api/analytics/campaigns');
}
