// Campaign and Auto-Campaign Types

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
  estimatedCount?: number;
}

export interface CampaignMetrics {
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  respondedCount: number;
}

export interface Campaign {
  _id: string;
  orgId: string;
  name: string;
  description?: string;
  type: 'event' | 'promotional' | 'announcement';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
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

// API Request Types
export interface CampaignListParams {
  status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  type?: 'event' | 'promotional' | 'announcement';
  page?: number;
  limit?: number;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  pagination: { total: number; page: number; limit: number };
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: 'event' | 'promotional' | 'announcement';
  scheduledAt: string;
  template: {
    name: string;
    language: string;
    parameters?: string[];
    dynamicParameters?: Array<{ position: number; field: string }>;
  };
  audience: {
    type: 'all' | 'segment' | 'custom';
    filters?: {
      minVisits?: number;
      maxDaysSinceLastVisit?: number;
      minTotalSpend?: number;
      outlets?: string[];
    };
    customPhoneNumbers?: string[];
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

// Auto Campaign Types
export interface AutoCampaignTriggerConfig {
  runTime?: string;
  maxSendsPerCustomer?: number;
  cooldownDays?: number;
  dateOffset?: { days: number; reference: 'before' | 'on' | 'after' };
  inactivity?: { thresholdDays: number; excludeRecentCampaigns: boolean };
  postVisit?: { daysAfter: number; visitType: 'first' | 'any' };
}

export interface AutoCampaignMetrics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  lastRunAt?: string;
  lastRunCount?: number;
}

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

// Campaign Analytics
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

