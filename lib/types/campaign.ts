// Campaign and Campaign Configuration Types

import type { TemplateVariableMappings } from "./template-variable-mapping";

// ============================================================================
// One-Time Campaign Types (Event/Promotional/Announcement)
// ============================================================================

export interface CampaignTemplate {
  name: string;
  language: string;
  parameters?: string[];
  dynamicParameters?: Array<{ position: number; field: string }>;
}

export interface CampaignAudience {
  type: 'all' | 'segment' | 'custom';
  filters?: {
    minVisits?: number;
    maxDaysSinceLastVisit?: number;
    minTotalSpend?: number;
    outlets?: string[];
    hasEmail?: boolean;
    hasBirthday?: boolean;
  };
  customPhoneNumbers?: string[];
  segmentId?: string;
  estimatedCount?: number;
}

export interface CampaignMetrics {
  targetCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  failedCount?: number;
  respondedCount?: number;
}

export interface Campaign {
  _id: string;
  orgId: string;
  name: string;
  description?: string;
  type?: 'event' | 'promotional' | 'announcement';
  status: 'draft' | 'preparing' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
  scheduledAt: string;
  executedAt?: string;
  completedAt?: string;
  template: CampaignTemplate;
  audience: CampaignAudience;
  metrics: CampaignMetrics;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// API Request Types for One-Time Campaigns
export interface CampaignListParams {
  status?: 'draft' | 'preparing' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
  type?: 'event' | 'promotional' | 'announcement';
  page?: number;
  limit?: number;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  pagination?: { total: number; page: number; limit: number };
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type?: 'event' | 'promotional' | 'announcement';
  scheduledAt: string;
  campaignDefinitionId: string;
  userInputParameters?: Record<string, string>;
  audience: {
    type: 'all' | 'segment' | 'custom';
    filters?: {
      minVisits?: number;
      maxDaysSinceLastVisit?: number;
      minTotalSpend?: number;
      outlets?: string[];
      hasEmail?: boolean;
      hasBirthday?: boolean;
    };
    customPhoneNumbers?: string[];
    segmentId?: string;
  };
}

export interface AudiencePreviewResponse {
  estimatedCount: number;
  sampleCustomers: Array<{
    name: string;
    phone: string;
    lastVisitAt?: string;
  }>;
}

// ============================================================================
// Campaign Configuration Types (Auto Campaigns - Config Based)
// ============================================================================

export interface BirthdayConfig {
  enabled: boolean;
  daysOffset: number;       // -7 = 7 days before, 0 = on day, 3 = 3 days after
  sendTime: string;         // "10:00" (24hr format)
  minVisits: number;
  templateId: string;       // Read-only, set by admin
}

export interface AnniversaryConfig {
  enabled: boolean;
  daysOffset: number;
  sendTime: string;
  minVisits: number;
  templateId: string;
}

export interface FirstVisitConfig {
  enabled: boolean;
  daysAfter: number;        // Days after first visit (1-30)
  sendTime: string;
  templateId: string;
}

export interface WinbackTier {
  days: number;             // 15, 30, 60, 90
  enabled: boolean;
  templateId: string;
}

export interface WinbackConfig {
  enabled: boolean;
  tiers: WinbackTier[];
  cooldownDays: number;     // Min days between messages
  minVisits: number;
}

export interface FestivalConfig {
  id: string;               // Auto-generated
  name: string;
  date: string;             // "MM-DD" format
  year?: number;            // Optional: for one-time events
  daysOffset: number;       // Days before to send
  enabled: boolean;
  templateId: string;
}

export interface UtilityConfig {
  billMessaging: {
    enabled: boolean;
    autoSend: boolean;      // Auto-send after transaction
    templateId: string;
  };
  feedback: {
    enabled: boolean;
    delayMinutes: number;   // 15-1440 minutes
    campaignDefinitionId?: string;
    definitionId?: string;
    userInputParameters?: Record<string, string>;
  };
  reviewRequest: {
    enabled: boolean;
    daysAfterVisit: number;
    reviewLink: string;     // Google/Zomato URL
    templateId: string;
    templateVariableMappings?: TemplateVariableMappings;
  };
}

export interface CampaignConfig {
  orgId: string;
  birthday: BirthdayConfig;
  anniversary: AnniversaryConfig;
  firstVisit: FirstVisitConfig;
  winback: WinbackConfig;
  festivals: FestivalConfig[];
  utility: UtilityConfig;
  defaultSendTime: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface DashboardOverview {
  customers: {
    total: number;
    new: number;
    returning: number;
    loyal: number;
    vip: number;
    active: number;
    atRisk: number;
    lapsed: number;
  };
  campaigns: {
    totalSent: number;
    sent24h: number;
    sent7d: number;
    sent30d: number;
  };
  messages: {
    deliveryRate: number;   // Percentage
    readRate: number;       // Percentage
  };
  revenue: {
    total30d: number;
    avgOrderValue: number;
  };
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  deliveryRate: number;     // Percentage
  readRate: number;         // Percentage
}

export interface AutoCampaignStats {
  birthday: CampaignStats;
  anniversary: CampaignStats;
  winback: CampaignStats;
  festival: CampaignStats;
  firstVisit: CampaignStats;
  feedback: CampaignStats;
}

export interface TemplateStats {
  templateName: string;
  totalSent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  lastUsed?: string;        // ISO date string
}

export interface TemplatePerformance {
  summary: TemplateStats;
  timeseries: Array<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
}

export interface SegmentCounts {
  frequency: {
    new: number;
    returning: number;
    loyal: number;
    vip: number;
  };
  recency: {
    active: number;
    at_risk: number;
    lapsed: number;
  };
  total: number;
}

// Audience Filter (for preview)
export interface SegmentFilter {
  frequency?: ('new' | 'returning' | 'loyal' | 'vip')[];
  recency?: ('active' | 'at_risk' | 'lapsed')[];
  minVisits?: number;
  maxVisits?: number;
  minSpend?: number;
  maxSpend?: number;
  minDaysSinceVisit?: number;
  maxDaysSinceVisit?: number;
}

export interface AudiencePreviewResult {
  audienceCount: number;
  filter: SegmentFilter & { whatsappOptIn: boolean };
}

// ============================================================================
// Legacy Types (Deprecated - kept for backward compatibility during migration)
// ============================================================================

/** @deprecated Use CampaignConfig-based approach instead */
export interface AutoCampaignTriggerConfig {
  runTime?: string;
  maxSendsPerCustomer?: number;
  cooldownDays?: number;
  dateOffset?: { days: number; reference: 'before' | 'on' | 'after' };
  inactivity?: { thresholdDays: number; excludeRecentCampaigns: boolean };
  postVisit?: { daysAfter: number; visitType: 'first' | 'any' };
}

/** @deprecated Use CampaignConfig-based approach instead */
export interface AutoCampaignMetrics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  lastRunAt?: string;
  lastRunCount?: number;
}

/** @deprecated Use CampaignConfig-based approach instead */
export interface AutoCampaign {
  _id: string;
  orgId: string;
  name: string;
  triggerType: 'birthday' | 'anniversary' | 'winback' | 'first_visit_followup' | 'custom';
  status: 'active' | 'paused' | 'draft';
  triggerConfig: AutoCampaignTriggerConfig;
  template: CampaignTemplate;
  audienceFilters?: {
    minVisits?: number;
    minTotalSpend?: number;
    outlets?: string[];
  };
  schedule: { frequency: 'daily' | 'hourly'; runAt?: string };
  metrics: AutoCampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use CampaignConfig-based approach instead */
export interface CreateAutoCampaignRequest {
  name: string;
  triggerType: 'birthday' | 'anniversary' | 'winback' | 'first_visit_followup';
  triggerConfig: {
    runTime: string;
    cooldownDays: number;
    dateOffset?: { days: number; reference: 'before' | 'on' | 'after' };
    inactivity?: { thresholdDays: number };
  };
  template: {
    name: string;
    language: string;
    dynamicParameters?: Array<{ position: number; field: string }>;
  };
  audienceFilters?: {
    minVisits?: number;
    minTotalSpend?: number;
  };
}

/** @deprecated Use DashboardOverview instead */
export interface CampaignAnalytics {
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    deliveryRate: number;
    readRate: number;
  };
  byType: Array<{
    type: string;
    count: number;
    sent: number;
    delivered: number;
  }>;
  recentCampaigns: Campaign[];
}

/** @deprecated Use SegmentCounts instead */
export interface CustomerAnalytics {
  summary: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    activeCustomers: number;
    lapsedCustomers: number;
  };
  visitTrends: Array<{
    date: string;
    visits: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    name: string;
    totalSpend: number;
    visits: number;
  }>;
}
