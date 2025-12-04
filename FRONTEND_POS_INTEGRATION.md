# Frontend Integration Guide - POS & Campaign System

This document provides complete integration details for building the frontend dashboard to manage POS customers, campaigns, and settings.

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Base Configuration](#api-base-configuration)
3. [Organization Settings Management](#organization-settings-management)
4. [POS Customer Management](#pos-customer-management)
5. [Campaign Management](#campaign-management)
6. [Auto Campaign Management](#auto-campaign-management)
7. [Analytics & Reporting](#analytics--reporting)
8. [Real-time Updates](#real-time-updates)
9. [Error Handling](#error-handling)
10. [TypeScript Interfaces](#typescript-interfaces)

---

## Authentication

All admin API calls require the `X-ADMIN-TOKEN` header.

```typescript
// lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-ADMIN-TOKEN': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
      'X-ORG-ID': getCurrentOrgId(), // Multi-tenant support
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.message || 'API Error', response.status, error);
  }

  return response.json();
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

---

## API Base Configuration

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=https://api.yourservice.com
NEXT_PUBLIC_ADMIN_TOKEN=your_admin_token
```

### Multi-Org Support

```typescript
// lib/org-context.tsx
import { createContext, useContext, useState } from 'react';

interface OrgContextType {
  orgId: string;
  orgName: string;
  setOrg: (orgId: string, orgName: string) => void;
}

const OrgContext = createContext<OrgContextType | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [org, setOrgState] = useState({ orgId: 'default', orgName: 'Default' });

  const setOrg = (orgId: string, orgName: string) => {
    setOrgState({ orgId, orgName });
    localStorage.setItem('currentOrgId', orgId);
  };

  return (
    <OrgContext.Provider value={{ ...org, setOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext)!;
```

---

## Organization Settings Management

### Get Organization Settings

```typescript
// GET /api/org-settings/:orgId
interface OrgSettings {
  orgId: string;
  orgName: string;
  services: {
    posIntegration: { enabled: boolean; syncFrequency: 'realtime' | 'hourly' | 'daily' };
    feedback: { enabled: boolean; autoSendAfterTransaction: boolean; delayMinutes: number };
    billMessaging: { enabled: boolean; autoSend: boolean };
    eventCampaigns: { enabled: boolean; maxPerMonth?: number };
    autoCampaigns: { enabled: boolean; allowedTriggers: string[] };
    loyalty: { enabled: boolean };
  };
  whatsapp: { phoneNumberId: string; defaultLanguage: string };
  timezone: string;
  posApiCredentials?: {
    apiKey: string; // Partial, masked
    isActive: boolean;
    createdAt: string;
    lastUsedAt?: string;
  };
}

// Usage
const settings = await apiClient<OrgSettings>(`/api/org-settings/${orgId}`);
```

### Enable/Disable Services

```typescript
// PATCH /api/org-settings/:orgId/services
interface ServiceUpdate {
  service: 'posIntegration' | 'feedback' | 'billMessaging' | 'eventCampaigns' | 'autoCampaigns' | 'loyalty';
  enabled: boolean;
  config?: Record<string, any>;
}

await apiClient(`/api/org-settings/${orgId}/services`, {
  method: 'PATCH',
  body: JSON.stringify({
    service: 'autoCampaigns',
    enabled: true,
    config: {
      allowedTriggers: ['birthday', 'anniversary', 'winback']
    }
  })
});
```

### Frontend Component: Service Toggle

```tsx
// components/ServiceToggle.tsx
interface ServiceToggleProps {
  service: string;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children?: React.ReactNode; // Additional config options
}

function ServiceToggle({ service, label, description, enabled, onToggle, children }: ServiceToggleProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{label}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && children && (
        <div className="mt-4 pt-4 border-t">
          {children}
        </div>
      )}
    </div>
  );
}
```

---

## POS Customer Management

### List Customers

```typescript
// GET /api/pos/customers
interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'lastVisitAt' | 'totalSpend' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  filters?: {
    hasEmail?: boolean;
    hasBirthday?: boolean;
    minVisits?: number;
    daysSinceLastVisit?: number;
  };
}

interface CustomerListResponse {
  customers: POSCustomer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface POSCustomer {
  _id: string;
  orgId: string;
  posCustomerId: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  anniversary?: string;
  visitMetrics: {
    totalVisits: number;
    totalSpend: number;
    averageOrderValue: number;
    firstVisitAt?: string;
    lastVisitAt?: string;
    daysSinceLastVisit?: number;
  };
  preferences: {
    whatsappOptIn: boolean;
    preferredLanguage: string;
  };
  syncStatus: 'active' | 'archived' | 'sync_error';
  createdAt: string;
  updatedAt: string;
}

// Usage
const { customers, pagination } = await apiClient<CustomerListResponse>(
  `/api/pos/customers?page=1&limit=20&search=rahul`
);
```

### Get Customer Detail

```typescript
// GET /api/pos/customers/:customerId
interface CustomerDetail extends POSCustomer {
  transactions: POSTransaction[];
  campaignHistory: CampaignExecution[];
}

const customer = await apiClient<CustomerDetail>(`/api/pos/customers/${customerId}`);
```

### Customer Transactions

```typescript
// GET /api/pos/customers/:customerId/transactions
interface TransactionListResponse {
  transactions: POSTransaction[];
  pagination: { total: number; page: number; limit: number };
}

interface POSTransaction {
  _id: string;
  posTransactionId: string;
  transactionDate: string;
  outletName?: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'other';
  totalAmount: number;
  paymentMethod: string;
  items: Array<{
    itemName: string;
    quantity: number;
    totalPrice: number;
  }>;
  billSentVia?: { whatsapp: boolean; sentAt?: string };
  feedbackRequested?: { sent: boolean; responseReceived?: boolean };
}
```

### Frontend Component: Customer List

```tsx
// components/CustomerList.tsx
function CustomerList() {
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  async function fetchCustomers() {
    const data = await apiClient<CustomerListResponse>(
      `/api/pos/customers?page=${page}&limit=20&search=${search}`
    );
    setCustomers(data.customers);
  }

  return (
    <div>
      <Input
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead>Total Spend</TableHead>
            <TableHead>Last Visit</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer._id}>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell>{customer.visitMetrics.totalVisits}</TableCell>
              <TableCell>₹{customer.visitMetrics.totalSpend.toLocaleString()}</TableCell>
              <TableCell>
                {customer.visitMetrics.lastVisitAt 
                  ? formatDistanceToNow(new Date(customer.visitMetrics.lastVisitAt))
                  : 'Never'}
              </TableCell>
              <TableCell>
                <Button variant="ghost" onClick={() => viewCustomer(customer._id)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Campaign Management

### List Campaigns

```typescript
// GET /api/campaigns
interface CampaignListParams {
  status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  type?: 'event' | 'promotional' | 'announcement';
  page?: number;
  limit?: number;
}

interface CampaignListResponse {
  campaigns: Campaign[];
  pagination: { total: number; page: number; limit: number };
}

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  type: 'event' | 'promotional' | 'announcement';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  scheduledAt: string;
  executedAt?: string;
  completedAt?: string;
  template: {
    name: string;
    language: string;
  };
  audience: {
    type: 'all' | 'segment' | 'custom';
    estimatedCount?: number;
  };
  metrics: {
    targetCount: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
  };
  createdAt: string;
}
```

### Create Campaign

```typescript
// POST /api/campaigns
interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: 'event' | 'promotional' | 'announcement';
  scheduledAt: string; // ISO 8601
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

const campaign = await apiClient<Campaign>('/api/campaigns', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Diwali 2024 Offer',
    type: 'event',
    scheduledAt: '2024-11-01T09:00:00Z',
    template: {
      name: 'diwali_offer_2024',
      language: 'en',
      dynamicParameters: [
        { position: 0, field: 'customer.name' }
      ]
    },
    audience: {
      type: 'segment',
      filters: {
        minVisits: 2,
        maxDaysSinceLastVisit: 90
      }
    }
  })
});
```

### Get Audience Preview

```typescript
// POST /api/campaigns/preview-audience
interface AudiencePreviewResponse {
  estimatedCount: number;
  sampleCustomers: Array<{
    name: string;
    phone: string;
    lastVisitAt?: string;
  }>;
}

const preview = await apiClient<AudiencePreviewResponse>('/api/campaigns/preview-audience', {
  method: 'POST',
  body: JSON.stringify({
    filters: {
      minVisits: 2,
      maxDaysSinceLastVisit: 90
    }
  })
});
```

### Campaign Actions

```typescript
// POST /api/campaigns/:id/schedule
await apiClient(`/api/campaigns/${campaignId}/schedule`, { method: 'POST' });

// POST /api/campaigns/:id/pause
await apiClient(`/api/campaigns/${campaignId}/pause`, { method: 'POST' });

// POST /api/campaigns/:id/resume
await apiClient(`/api/campaigns/${campaignId}/resume`, { method: 'POST' });

// POST /api/campaigns/:id/cancel
await apiClient(`/api/campaigns/${campaignId}/cancel`, { method: 'POST' });

// DELETE /api/campaigns/:id (only draft campaigns)
await apiClient(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
```

### Frontend Component: Campaign Creation Form

```tsx
// components/CampaignForm.tsx
function CampaignForm() {
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    name: '',
    type: 'event',
    scheduledAt: '',
    template: { name: '', language: 'en' },
    audience: { type: 'all' }
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreviewResponse | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    apiClient<{ data: Template[] }>('/api/templates').then(res => setTemplates(res.data));
  }, []);

  // Preview audience when filters change
  useEffect(() => {
    if (formData.audience.type === 'segment' && formData.audience.filters) {
      previewAudience();
    }
  }, [formData.audience.filters]);

  async function previewAudience() {
    const preview = await apiClient<AudiencePreviewResponse>('/api/campaigns/preview-audience', {
      method: 'POST',
      body: JSON.stringify({ filters: formData.audience.filters })
    });
    setAudiencePreview(preview);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const campaign = await apiClient<Campaign>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    // Navigate to campaign detail
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Campaign Name */}
      <Input
        label="Campaign Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      {/* Campaign Type */}
      <Select
        label="Type"
        value={formData.type}
        onValueChange={(value) => setFormData({ ...formData, type: value as any })}
      >
        <SelectItem value="event">Event (Diwali, New Year, etc.)</SelectItem>
        <SelectItem value="promotional">Promotional</SelectItem>
        <SelectItem value="announcement">Announcement</SelectItem>
      </Select>

      {/* Schedule */}
      <DateTimePicker
        label="Scheduled For"
        value={formData.scheduledAt}
        onChange={(date) => setFormData({ ...formData, scheduledAt: date })}
      />

      {/* Template Selection */}
      <Select
        label="WhatsApp Template"
        value={formData.template.name}
        onValueChange={(name) => setFormData({
          ...formData,
          template: { ...formData.template, name }
        })}
      >
        {templates.map((t) => (
          <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
        ))}
      </Select>

      {/* Audience Selection */}
      <RadioGroup
        value={formData.audience.type}
        onValueChange={(type) => setFormData({
          ...formData,
          audience: { type: type as any }
        })}
      >
        <RadioGroupItem value="all" label="All Customers" />
        <RadioGroupItem value="segment" label="Customer Segment" />
        <RadioGroupItem value="custom" label="Custom List" />
      </RadioGroup>

      {/* Segment Filters */}
      {formData.audience.type === 'segment' && (
        <div className="space-y-4">
          <Input
            type="number"
            label="Minimum Visits"
            value={formData.audience.filters?.minVisits || ''}
            onChange={(e) => setFormData({
              ...formData,
              audience: {
                ...formData.audience,
                filters: {
                  ...formData.audience.filters,
                  minVisits: parseInt(e.target.value)
                }
              }
            })}
          />
          
          {audiencePreview && (
            <div className="bg-blue-50 p-4 rounded">
              <p className="font-medium">
                Estimated Reach: {audiencePreview.estimatedCount} customers
              </p>
            </div>
          )}
        </div>
      )}

      <Button type="submit">Create Campaign</Button>
    </form>
  );
}
```

---

## Auto Campaign Management

### List Auto Campaigns

```typescript
// GET /api/auto-campaigns
interface AutoCampaign {
  _id: string;
  name: string;
  triggerType: 'birthday' | 'anniversary' | 'winback' | 'first_visit_followup' | 'custom';
  status: 'active' | 'paused' | 'draft';
  triggerConfig: {
    runTime?: string;
    dateOffset?: { days: number; reference: 'before' | 'on' | 'after' };
    inactivity?: { thresholdDays: number };
    cooldownDays?: number;
  };
  template: { name: string; language: string };
  metrics: {
    totalSent: number;
    totalDelivered: number;
    lastRunAt?: string;
    lastRunCount?: number;
  };
}

const { autoCampaigns } = await apiClient<{ autoCampaigns: AutoCampaign[] }>('/api/auto-campaigns');
```

### Create Auto Campaign

```typescript
// POST /api/auto-campaigns
interface CreateAutoCampaignRequest {
  name: string;
  triggerType: 'birthday' | 'anniversary' | 'winback' | 'first_visit_followup';
  triggerConfig: {
    runTime: string; // "09:00"
    cooldownDays: number;
    
    // For birthday/anniversary
    dateOffset?: { days: number; reference: 'before' | 'on' | 'after' };
    
    // For winback
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

// Example: Birthday campaign 7 days before
await apiClient('/api/auto-campaigns', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Birthday Wishes - 7 Days Before',
    triggerType: 'birthday',
    triggerConfig: {
      runTime: '10:00',
      cooldownDays: 365,
      dateOffset: { days: 7, reference: 'before' }
    },
    template: {
      name: 'birthday_offer',
      language: 'en',
      dynamicParameters: [{ position: 0, field: 'customer.name' }]
    },
    audienceFilters: {
      minVisits: 2
    }
  })
});
```

### Auto Campaign Actions

```typescript
// POST /api/auto-campaigns/:id/activate
await apiClient(`/api/auto-campaigns/${id}/activate`, { method: 'POST' });

// POST /api/auto-campaigns/:id/pause
await apiClient(`/api/auto-campaigns/${id}/pause`, { method: 'POST' });

// DELETE /api/auto-campaigns/:id
await apiClient(`/api/auto-campaigns/${id}`, { method: 'DELETE' });
```

### Frontend Component: Auto Campaign Card

```tsx
// components/AutoCampaignCard.tsx
function AutoCampaignCard({ campaign }: { campaign: AutoCampaign }) {
  const getTriggerDescription = () => {
    switch (campaign.triggerType) {
      case 'birthday':
        const bOffset = campaign.triggerConfig.dateOffset;
        if (bOffset?.reference === 'before') {
          return `${bOffset.days} days before birthday`;
        } else if (bOffset?.reference === 'after') {
          return `${bOffset.days} days after birthday`;
        }
        return 'On birthday';
        
      case 'anniversary':
        const aOffset = campaign.triggerConfig.dateOffset;
        return aOffset?.days ? `${aOffset.days} days before anniversary` : 'On anniversary';
        
      case 'winback':
        return `After ${campaign.triggerConfig.inactivity?.thresholdDays} days of inactivity`;
        
      default:
        return campaign.triggerType;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{campaign.name}</CardTitle>
          <Badge variant={campaign.status === 'active' ? 'success' : 'secondary'}>
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <strong>Trigger:</strong> {getTriggerDescription()}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Runs at:</strong> {campaign.triggerConfig.runTime} daily
          </p>
          <p className="text-sm text-gray-600">
            <strong>Template:</strong> {campaign.template.name}
          </p>
          
          {campaign.metrics.lastRunAt && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                Last run: {formatDistanceToNow(new Date(campaign.metrics.lastRunAt))} ago
                ({campaign.metrics.lastRunCount} sent)
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {campaign.status === 'active' ? (
          <Button variant="outline" onClick={() => pauseCampaign(campaign._id)}>
            Pause
          </Button>
        ) : (
          <Button onClick={() => activateCampaign(campaign._id)}>
            Activate
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

---

## Analytics & Reporting

### Campaign Analytics

```typescript
// GET /api/analytics/campaigns
interface CampaignAnalytics {
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

const analytics = await apiClient<CampaignAnalytics>('/api/analytics/campaigns');
```

### Customer Analytics

```typescript
// GET /api/analytics/customers
interface CustomerAnalytics {
  summary: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    activeCustomers: number; // visited in last 30 days
    lapsedCustomers: number; // no visit in 30+ days
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
```

### POS Sync Status

```typescript
// GET /api/pos/sync/status
interface SyncStatus {
  lastSync: {
    type: 'customers' | 'transactions';
    status: 'completed' | 'failed' | 'partial';
    completedAt: string;
    stats: {
      recordsProcessed: number;
      recordsCreated: number;
      recordsFailed: number;
    };
  };
  syncHistory: Array<{
    type: string;
    status: string;
    completedAt: string;
    recordsProcessed: number;
  }>;
}
```

---

## Real-time Updates

For real-time campaign status updates, consider polling or WebSocket:

```typescript
// Polling example for campaign status
function useCampaignStatus(campaignId: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function fetchStatus() {
      const data = await apiClient<Campaign>(`/api/campaigns/${campaignId}`);
      setCampaign(data);
      
      // Stop polling when campaign is completed
      if (['completed', 'cancelled'].includes(data.status)) {
        clearInterval(interval);
      }
    }

    fetchStatus();
    interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [campaignId]);

  return campaign;
}
```

---

## Error Handling

```typescript
// lib/error-handler.ts
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return error.details?.message || 'Invalid request data';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        // Validation errors
        if (error.details?.details) {
          return error.details.details
            .map((d: any) => d.message)
            .join(', ');
        }
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// Usage with toast
import { toast } from 'sonner';

try {
  await createCampaign(data);
  toast.success('Campaign created successfully!');
} catch (error) {
  toast.error(handleApiError(error));
}
```

---

## TypeScript Interfaces

Create a shared types file:

```typescript
// lib/types/pos.ts
export interface POSCustomer {
  _id: string;
  orgId: string;
  posCustomerId: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  anniversary?: string;
  visitMetrics: {
    totalVisits: number;
    totalSpend: number;
    averageOrderValue: number;
    firstVisitAt?: string;
    lastVisitAt?: string;
    daysSinceLastVisit?: number;
  };
  preferences: {
    whatsappOptIn: boolean;
    smsOptIn: boolean;
    emailOptIn: boolean;
    preferredLanguage: string;
  };
  campaignHistory: {
    lastBirthdayCampaignYear?: number;
    lastAnniversaryCampaignYear?: number;
    lastWinbackCampaignAt?: string;
  };
  syncStatus: 'active' | 'archived' | 'sync_error';
  createdAt: string;
  updatedAt: string;
}

export interface POSTransaction {
  _id: string;
  orgId: string;
  customerId: string;
  posTransactionId: string;
  transactionDate: string;
  outletId?: string;
  outletName?: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'other';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  currency: string;
  items: TransactionItem[];
  servedBy?: { staffId: string; staffName: string };
  billSentVia?: { whatsapp: boolean; sentAt?: string; messageId?: string };
  feedbackRequested?: { sent: boolean; sentAt?: string; responseReceived?: boolean };
}

export interface TransactionItem {
  itemId: string;
  itemName: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: Array<{ name: string; price: number }>;
  discountApplied?: number;
}

// lib/types/campaign.ts
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
```

---

## Page Structure Recommendations

```
app/
├── (dashboard)/
│   ├── layout.tsx           # Dashboard layout with sidebar
│   ├── page.tsx              # Dashboard home / overview
│   ├── customers/
│   │   ├── page.tsx          # Customer list
│   │   └── [id]/page.tsx     # Customer detail
│   ├── campaigns/
│   │   ├── page.tsx          # Campaign list
│   │   ├── new/page.tsx      # Create campaign
│   │   └── [id]/page.tsx     # Campaign detail
│   ├── auto-campaigns/
│   │   ├── page.tsx          # Auto campaign list
│   │   └── new/page.tsx      # Create auto campaign
│   ├── analytics/
│   │   └── page.tsx          # Analytics dashboard
│   └── settings/
│       ├── page.tsx          # Org settings
│       └── pos/page.tsx      # POS integration settings
└── api/                      # API routes if needed for SSR
```

---

## Next Steps

1. **Set up API client** with proper error handling
2. **Implement org context** for multi-tenant support
3. **Build customer list page** with search and filters
4. **Build campaign creation flow** with template selection
5. **Build auto-campaign configuration** with trigger setup
6. **Add analytics dashboard** with charts
7. **Implement settings page** for service configuration

