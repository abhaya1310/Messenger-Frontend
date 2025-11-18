// API helper functions for frontend
// All API calls go directly to the backend using NEXT_PUBLIC_BACKEND_URL
// This allows frontend and backend to be deployed separately
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

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
  const url = new URL('/api/templates', API_BASE);
  if (limit) {
    url.searchParams.append('limit', limit.toString());
  }
  
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch templates: ${res.statusText}`);
  }
  return res.json();
}

export async function analyzeTemplate(templateName: string): Promise<{ templateName: string; analysis: TemplateAnalysis }> {
  const res = await fetch(`${API_BASE}/api/templates/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
    },
    body: JSON.stringify({ templateName }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to analyze template: ${res.statusText}`);
  }
  return res.json();
}

export async function analyzeCsv(file: File, templateName?: string): Promise<CsvAnalysis> {
  const formData = new FormData();
  formData.append('file', file);
  if (templateName) {
    formData.append('templateName', templateName);
  }
  
  const res = await fetch(`${API_BASE}/api/csv/analyze`, {
    method: 'POST',
    headers: {
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
    },
    body: formData,
  });
  
  if (!res.ok) {
    throw new Error(`Failed to analyze CSV: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchAnalytics(params?: Record<string, string>): Promise<AnalyticsData> {
  const url = new URL('/api/analytics', API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch analytics: ${res.statusText}`);
  }
  return res.json();
}

export async function exportAnalytics(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/analytics/export`, {
    headers: {
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to export analytics: ${res.statusText}`);
  }
  
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
  const url = new URL('/analytics/templates', API_BASE);
  if (params.language) url.searchParams.set('language', params.language);
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetch(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch templates analytics: ${res.statusText}`);
  return res.json();
}

export async function fetchAnalyticsSummary(params: { start?: string; end?: string; language?: string; granularity?: 'auto'|'hour'|'day'; orgId?: string }) {
  const url = new URL('/analytics/summary', API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetch(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch analytics summary: ${res.statusText}`);
  return res.json();
}

export async function fetchTemplateSeries(name: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto'|'hour'|'day'; orgId?: string }) {
  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/series`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetch(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch template series: ${res.statusText}`);
  return res.json();
}

export async function fetchTemplateVariables(name: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto'|'hour'|'day'; orgId?: string }) {
  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/variables`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetch(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch template variables: ${res.statusText}`);
  return res.json();
}

export async function fetchTopValues(name: string, variable: string, params: { start?: string; end?: string; language?: string; granularity?: 'auto'|'hour'|'day'; limit?: number; orgId?: string }) {
  const url = new URL(`/analytics/template/${encodeURIComponent(name)}/variables/${encodeURIComponent(variable)}/top`, API_BASE);
  Object.entries(params).forEach(([k, v]) => { if (v && k !== 'orgId') url.searchParams.set(k, String(v)); });
  const orgId = params.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  const res = await fetch(url.toString(), {
    headers: orgId ? { 'X-ORG-ID': orgId } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch top values: ${res.statusText}`);
  return res.json();
}

export async function sendFeedbackCsv(
  file: File,
  templateName?: string,
  language?: string,
  dryRun?: boolean
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (templateName) formData.append('templateName', templateName);
  if (language) formData.append('language', language);
  if (dryRun !== undefined) formData.append('dryRun', dryRun.toString());

  const res = await fetch(`${API_BASE}/send-feedback-csv`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to send feedback CSV: ${res.statusText}`);
  }
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
  const res = await fetch(`${API_BASE}/api/send-template-dynamic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
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

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: { message: res.statusText } }));
    
    // Extract error message from various possible structures
    let errorMessage = 'Unknown error';
    if (errorData.error) {
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (errorData.error.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.error.details) {
        errorMessage = JSON.stringify(errorData.error.details);
      }
    }
    
    console.error('Send template error:', {
      status: res.status,
      statusText: res.statusText,
      errorData,
      extractedMessage: errorMessage
    });
    
    throw new Error(`Failed to send template: ${errorMessage}`);
  }
  return res.json();
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
  
  const res = await fetch(url.toString(), {
    headers: {
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
    },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch conversations: ${res.statusText}`);
  }
  return res.json();
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
  const url = new URL(`/conversations/${encodeURIComponent(phoneNumber)}/messages`, API_BASE);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });
  
  const res = await fetch(url.toString(), {
    headers: {
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
    },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch conversation messages: ${res.statusText}`);
  }
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
  const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(phoneNumber)}/metadata`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
    },
    body: JSON.stringify(metadata),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to update conversation metadata: ${res.statusText}`);
  }
  return res.json();
}

export async function sendTextMessage(
  to: string,
  text: string,
  contextMessageId?: string
): Promise<{ messageId: string }> {
  const res = await fetch(`${API_BASE}/send-text`, {
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
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Failed to send text message: ${errorData.error?.message || res.statusText}`);
  }
  return res.json();
}
