# Frontend Campaign Integration Guide

This document provides the frontend team with all API endpoints, request/response formats, and integration details for the Campaign Scheduler & Automation System.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Campaign Configuration APIs](#campaign-configuration-apis)
3. [Analytics APIs](#analytics-apis)
4. [Data Types & Interfaces](#data-types--interfaces)
5. [UI Components Needed](#ui-components-needed)
6. [Integration Examples](#integration-examples)

---

## Authentication

All API endpoints require the `X-ORG-ID` header to identify the organization.

```typescript
const headers = {
  'Content-Type': 'application/json',
  'X-ORG-ID': 'your_org_id'
};
```

---

## Campaign Configuration APIs

### Base URL: `/api/campaign-config`

---

### 1. Get Campaign Configuration

Retrieves all campaign settings for an organization.

**Request:**
```
GET /api/campaign-config
Headers: X-ORG-ID: <org_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orgId": "220006",
    "birthday": {
      "enabled": true,
      "daysOffset": 0,
      "sendTime": "10:00",
      "minVisits": 1,
      "templateId": "birthday_template_v1"
    },
    "anniversary": {
      "enabled": false,
      "daysOffset": 0,
      "sendTime": "10:00",
      "minVisits": 1,
      "templateId": ""
    },
    "firstVisit": {
      "enabled": true,
      "daysAfter": 1,
      "sendTime": "10:00",
      "templateId": "first_visit_v1"
    },
    "winback": {
      "enabled": true,
      "tiers": [
        { "days": 15, "enabled": true, "templateId": "winback_15" },
        { "days": 30, "enabled": true, "templateId": "winback_30" },
        { "days": 60, "enabled": false, "templateId": "" },
        { "days": 90, "enabled": false, "templateId": "" }
      ],
      "cooldownDays": 30,
      "minVisits": 2
    },
    "festivals": [
      { "id": "diwali", "name": "Diwali", "date": "11-01", "daysOffset": 3, "enabled": true, "templateId": "diwali_v1" },
      { "id": "christmas", "name": "Christmas", "date": "12-25", "daysOffset": 3, "enabled": true, "templateId": "christmas_v1" }
    ],
    "utility": {
      "billMessaging": { "enabled": true, "autoSend": true, "templateId": "bill_v1" },
      "feedback": { "enabled": true, "delayMinutes": 60, "templateId": "feedback_v1" },
      "reviewRequest": { "enabled": false, "daysAfterVisit": 1, "reviewLink": "", "templateId": "" }
    },
    "defaultSendTime": "10:00",
    "timezone": "Asia/Kolkata",
    "createdAt": "2024-12-05T10:00:00Z",
    "updatedAt": "2024-12-05T10:00:00Z"
  }
}
```

---

### 2. Update Campaign Configuration

Update one or more campaign settings.

**Request:**
```
PATCH /api/campaign-config
Headers: X-ORG-ID: <org_id>
Content-Type: application/json
```

**Body:**
```json
{
  "birthday": {
    "enabled": true,
    "daysOffset": -3,
    "sendTime": "09:00",
    "minVisits": 2
  },
  "defaultSendTime": "09:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated full config */ }
}
```

---

### 3. Update Birthday Campaign

**Request:**
```
PATCH /api/campaign-config/birthday
Headers: X-ORG-ID: <org_id>
```

**Body:**
```json
{
  "enabled": true,
  "daysOffset": -7,
  "sendTime": "10:00",
  "minVisits": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "daysOffset": -7,
    "sendTime": "10:00",
    "minVisits": 1,
    "templateId": "birthday_v1"
  }
}
```

---

### 4. Update Anniversary Campaign

**Request:**
```
PATCH /api/campaign-config/anniversary
Headers: X-ORG-ID: <org_id>
```

**Body:** Same structure as birthday

---

### 5. Update Winback ("We Miss You") Campaign

**Request:**
```
PATCH /api/campaign-config/winback
Headers: X-ORG-ID: <org_id>
```

**Body:**
```json
{
  "enabled": true,
  "tiers": [
    { "days": 15, "enabled": true, "templateId": "winback_15" },
    { "days": 30, "enabled": true, "templateId": "winback_30" },
    { "days": 60, "enabled": true, "templateId": "winback_60" },
    { "days": 90, "enabled": false, "templateId": "" }
  ],
  "cooldownDays": 30,
  "minVisits": 2
}
```

---

### 6. Add Winback Tier

**Request:**
```
POST /api/campaign-config/winback/tiers
Headers: X-ORG-ID: <org_id>
```

**Body:**
```json
{
  "days": 45,
  "enabled": true,
  "templateId": "winback_45"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "tiers": [
      { "days": 15, "enabled": true, "templateId": "winback_15" },
      { "days": 30, "enabled": true, "templateId": "winback_30" },
      { "days": 45, "enabled": true, "templateId": "winback_45" },
      { "days": 60, "enabled": false, "templateId": "" },
      { "days": 90, "enabled": false, "templateId": "" }
    ],
    "cooldownDays": 30,
    "minVisits": 2
  }
}
```

**Error Response (tier already exists):**
```json
{
  "error": "Tier already exists",
  "message": "A tier for 45 days already exists"
}
```

---

### 7. Remove Winback Tier

**Request:**
```
DELETE /api/campaign-config/winback/tiers/45
Headers: X-ORG-ID: <org_id>
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated winback config */ }
}
```

---

### 8. Add Festival

**Request:**
```
POST /api/campaign-config/festivals
Headers: X-ORG-ID: <org_id>
```

**Body:**
```json
{
  "name": "Eid",
  "date": "04-10",
  "daysOffset": 3,
  "enabled": true,
  "templateId": "eid_v1"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "diwali", "name": "Diwali", "date": "11-01", "daysOffset": 3, "enabled": true, "templateId": "diwali_v1" },
    { "id": "eid_1701772800000", "name": "Eid", "date": "04-10", "daysOffset": 3, "enabled": true, "templateId": "eid_v1" }
  ]
}
```

**Note:** Date format is `MM-DD` (e.g., "12-25" for December 25).

---

### 9. Update Festival

**Request:**
```
PATCH /api/campaign-config/festivals/diwali
Headers: X-ORG-ID: <org_id>
```

**Body:**
```json
{
  "enabled": false,
  "daysOffset": 5
}
```

---

### 10. Delete Festival

**Request:**
```
DELETE /api/campaign-config/festivals/diwali
Headers: X-ORG-ID: <org_id>
```

---

### 11. Update Utility Messaging

**Request:**
```
PATCH /api/campaign-config/utility
Headers: X-ORG-ID: <org_id>
```

**Body:**
```json
{
  "billMessaging": {
    "enabled": true,
    "autoSend": true,
    "templateId": "bill_v1"
  },
  "feedback": {
    "enabled": true,
    "delayMinutes": 120,
    "templateId": "feedback_v1"
  },
  "reviewRequest": {
    "enabled": true,
    "daysAfterVisit": 2,
    "reviewLink": "https://g.page/r/yourlink",
    "templateId": "review_v1"
  }
}
```

---

### 12. Preview Audience Count

Get the number of customers matching specific filters.

**Request:**
```
POST /api/campaign-config/preview
Headers: X-ORG-ID: <org_id>
```

**Body:**
```json
{
  "frequency": ["loyal", "vip"],
  "recency": ["active", "at_risk"],
  "minVisits": 3,
  "minSpend": 1000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "audienceCount": 156,
    "filter": {
      "frequency": ["loyal", "vip"],
      "recency": ["active", "at_risk"],
      "minVisits": 3,
      "minSpend": 1000,
      "whatsappOptIn": true
    }
  }
}
```

---

## Analytics APIs

### Base URL: `/api/analytics`

---

### 1. Dashboard Overview

Get summary stats for the dashboard.

**Request:**
```
GET /api/analytics/overview
Headers: X-ORG-ID: <org_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": {
      "total": 5420,
      "new": 1200,
      "returning": 2500,
      "loyal": 1200,
      "vip": 520,
      "active": 3200,
      "atRisk": 1500,
      "lapsed": 720
    },
    "campaigns": {
      "totalSent": 15000,
      "sent24h": 250,
      "sent7d": 1800,
      "sent30d": 7500
    },
    "messages": {
      "deliveryRate": 94,
      "readRate": 67
    },
    "revenue": {
      "total30d": 2500000,
      "avgOrderValue": 850.50
    }
  }
}
```

---

### 2. Campaign Stats

Get stats by campaign type.

**Request:**
```
GET /api/analytics/campaigns
GET /api/analytics/campaigns?type=birthday
GET /api/analytics/campaigns?type=winback&days=30
Headers: X-ORG-ID: <org_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "birthday": {
      "sent": 500,
      "delivered": 470,
      "read": 335,
      "failed": 30,
      "pending": 0,
      "deliveryRate": 94,
      "readRate": 67
    },
    "winback": {
      "sent": 800,
      "delivered": 720,
      "read": 480,
      "failed": 80,
      "pending": 0,
      "deliveryRate": 90,
      "readRate": 60
    }
  }
}
```

---

### 3. Auto-Campaign Summary

Get stats for all auto-campaign types.

**Request:**
```
GET /api/analytics/auto-campaigns
Headers: X-ORG-ID: <org_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "birthday": { "sent": 500, "delivered": 470, "read": 335, "failed": 30, "deliveryRate": 94, "readRate": 67 },
    "anniversary": { "sent": 200, "delivered": 185, "read": 120, "failed": 15, "deliveryRate": 92, "readRate": 60 },
    "winback": { "sent": 800, "delivered": 720, "read": 480, "failed": 80, "deliveryRate": 90, "readRate": 60 },
    "festival": { "sent": 5000, "delivered": 4700, "read": 3200, "failed": 300, "deliveryRate": 94, "readRate": 64 },
    "firstVisit": { "sent": 300, "delivered": 285, "read": 200, "failed": 15, "deliveryRate": 95, "readRate": 67 },
    "feedback": { "sent": 2000, "delivered": 1850, "read": 1400, "failed": 150, "deliveryRate": 92, "readRate": 70 }
  }
}
```

---

### 4. Template Stats

Get performance stats for all templates.

**Request:**
```
GET /api/analytics/templates
GET /api/analytics/templates?days=30
Headers: X-ORG-ID: <org_id>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "templateName": "birthday_v1",
      "totalSent": 500,
      "delivered": 470,
      "read": 335,
      "failed": 30,
      "deliveryRate": 94,
      "readRate": 67,
      "lastUsed": "2024-12-05T10:00:00Z"
    },
    {
      "templateName": "winback_30",
      "totalSent": 400,
      "delivered": 360,
      "read": 240,
      "failed": 40,
      "deliveryRate": 90,
      "readRate": 60,
      "lastUsed": "2024-12-04T09:00:00Z"
    }
  ]
}
```

---

### 5. Single Template Performance

Get daily performance for a specific template.

**Request:**
```
GET /api/analytics/templates/birthday_v1
GET /api/analytics/templates/birthday_v1?days=14
Headers: X-ORG-ID: <org_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "templateName": "birthday_v1",
      "totalSent": 500,
      "delivered": 470,
      "read": 335,
      "failed": 30,
      "deliveryRate": 94,
      "readRate": 67
    },
    "timeseries": [
      { "date": "2024-12-01T00:00:00Z", "sent": 35, "delivered": 33, "read": 22, "failed": 2 },
      { "date": "2024-12-02T00:00:00Z", "sent": 42, "delivered": 40, "read": 28, "failed": 2 },
      { "date": "2024-12-03T00:00:00Z", "sent": 38, "delivered": 36, "read": 25, "failed": 2 }
    ]
  }
}
```

---

### 6. Customer Segment Counts

Get breakdown of customers by segment.

**Request:**
```
GET /api/analytics/segments
Headers: X-ORG-ID: <org_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "frequency": {
      "new": 1200,
      "returning": 2500,
      "loyal": 1200,
      "vip": 520
    },
    "recency": {
      "active": 3200,
      "at_risk": 1500,
      "lapsed": 720
    },
    "total": 5420
  }
}
```

---

## Data Types & Interfaces

### TypeScript Interfaces

```typescript
// Campaign Configuration
interface CampaignConfig {
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

interface BirthdayConfig {
  enabled: boolean;
  daysOffset: number;       // -7 = 7 days before, 0 = on day, 3 = 3 days after
  sendTime: string;         // "10:00" (24hr format)
  minVisits: number;
  templateId: string;       // Read-only, set by admin
}

interface AnniversaryConfig {
  enabled: boolean;
  daysOffset: number;
  sendTime: string;
  minVisits: number;
  templateId: string;
}

interface FirstVisitConfig {
  enabled: boolean;
  daysAfter: number;        // Days after first visit (1-30)
  sendTime: string;
  templateId: string;
}

interface WinbackTier {
  days: number;             // 15, 30, 60, 90
  enabled: boolean;
  templateId: string;
}

interface WinbackConfig {
  enabled: boolean;
  tiers: WinbackTier[];
  cooldownDays: number;     // Min days between messages
  minVisits: number;
}

interface FestivalConfig {
  id: string;               // Auto-generated
  name: string;
  date: string;             // "MM-DD" format
  year?: number;            // Optional: for one-time events
  daysOffset: number;       // Days before to send
  enabled: boolean;
  templateId: string;
}

interface UtilityConfig {
  billMessaging: {
    enabled: boolean;
    autoSend: boolean;      // Auto-send after transaction
    templateId: string;
  };
  feedback: {
    enabled: boolean;
    delayMinutes: number;   // 15-1440 minutes
    templateId: string;
  };
  reviewRequest: {
    enabled: boolean;
    daysAfterVisit: number;
    reviewLink: string;     // Google/Zomato URL
    templateId: string;
  };
}

// Analytics
interface DashboardOverview {
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

interface CampaignStats {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  deliveryRate: number;     // Percentage
  readRate: number;         // Percentage
}

interface TemplateStats {
  templateName: string;
  totalSent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  lastUsed?: string;        // ISO date string
}

interface SegmentCounts {
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
interface SegmentFilter {
  frequency?: ('new' | 'returning' | 'loyal' | 'vip')[];
  recency?: ('active' | 'at_risk' | 'lapsed')[];
  minVisits?: number;
  maxVisits?: number;
  minSpend?: number;
  maxSpend?: number;
  minDaysSinceVisit?: number;
  maxDaysSinceVisit?: number;
}
```

---

## UI Components Needed

### 1. Campaign Dashboard

**Overview Page:**
- Customer segment breakdown (pie chart or cards)
- Campaign stats summary (sent, delivered, read rates)
- Recent campaign performance
- Revenue metrics

### 2. Auto-Campaign Settings

**For Each Campaign Type (Birthday, Anniversary, etc.):**
- Enable/Disable toggle
- Days offset input (with explanation: "-7 = 7 days before")
- Send time picker (24hr format)
- Min visits input
- Template info (read-only, display template name)

**Winback Settings:**
- Master enable/disable toggle
- Tier table with:
  - Days column
  - Enable toggle per tier
  - Add/Remove tier buttons
- Cooldown days input
- Min visits input

**Festival Settings:**
- List of configured festivals
- Add new festival form:
  - Festival name
  - Date picker (MM-DD format)
  - Days before to send
  - Enable toggle
- Edit/Delete per festival

### 3. Utility Messaging Settings

**Bill Messaging:**
- Enable toggle
- Auto-send toggle

**Feedback Request:**
- Enable toggle
- Delay minutes dropdown (30, 60, 120, etc.)

**Review Request:**
- Enable toggle
- Days after visit input
- Review link input (URL)

### 4. Analytics Pages

**Dashboard:**
- Summary cards (total customers, messages sent, delivery rate)
- Segment distribution chart
- Campaign performance chart (last 30 days)

**Template Analytics:**
- Template list with stats
- Click to view template detail with daily chart

**Campaign Performance:**
- Per-campaign type stats
- Trend visualization

### 5. Audience Preview

**When creating one-time campaigns:**
- Segment filter dropdowns
- Min visits input
- Preview button showing count
- Display: "This campaign will reach X customers"

---

## Integration Examples

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

const API_BASE = '/api';

export function useCampaignConfig(orgId: string) {
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, [orgId]);

  async function fetchConfig() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/campaign-config`, {
        headers: { 'X-ORG-ID': orgId }
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch config');
    } finally {
      setLoading(false);
    }
  }

  async function updateBirthday(updates: Partial<BirthdayConfig>) {
    try {
      const res = await fetch(`${API_BASE}/campaign-config/birthday`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-ORG-ID': orgId
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setConfig(prev => prev ? { ...prev, birthday: data.data } : null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function previewAudience(filter: SegmentFilter) {
    try {
      const res = await fetch(`${API_BASE}/campaign-config/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ORG-ID': orgId
        },
        body: JSON.stringify(filter)
      });
      const data = await res.json();
      return data.success ? data.data.audienceCount : 0;
    } catch {
      return 0;
    }
  }

  return { config, loading, error, fetchConfig, updateBirthday, previewAudience };
}
```

### API Service Example

```typescript
// api/campaignService.ts

const API_BASE = process.env.REACT_APP_API_URL || '';

class CampaignService {
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'X-ORG-ID': this.orgId
    };
  }

  // Campaign Config
  async getConfig(): Promise<CampaignConfig> {
    const res = await fetch(`${API_BASE}/api/campaign-config`, {
      headers: this.headers()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async updateConfig(updates: Partial<CampaignConfig>): Promise<CampaignConfig> {
    const res = await fetch(`${API_BASE}/api/campaign-config`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async updateWinback(updates: Partial<WinbackConfig>): Promise<WinbackConfig> {
    const res = await fetch(`${API_BASE}/api/campaign-config/winback`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async addFestival(festival: Omit<FestivalConfig, 'id'>): Promise<FestivalConfig[]> {
    const res = await fetch(`${API_BASE}/api/campaign-config/festivals`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(festival)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async removeFestival(festivalId: string): Promise<FestivalConfig[]> {
    const res = await fetch(`${API_BASE}/api/campaign-config/festivals/${festivalId}`, {
      method: 'DELETE',
      headers: this.headers()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async previewAudience(filter: SegmentFilter): Promise<number> {
    const res = await fetch(`${API_BASE}/api/campaign-config/preview`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(filter)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data.audienceCount;
  }

  // Analytics
  async getOverview(): Promise<DashboardOverview> {
    const res = await fetch(`${API_BASE}/api/analytics/overview`, {
      headers: this.headers()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getAutoCampaignStats(): Promise<Record<string, CampaignStats>> {
    const res = await fetch(`${API_BASE}/api/analytics/auto-campaigns`, {
      headers: this.headers()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getTemplateStats(days = 30): Promise<TemplateStats[]> {
    const res = await fetch(`${API_BASE}/api/analytics/templates?days=${days}`, {
      headers: this.headers()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getSegments(): Promise<SegmentCounts> {
    const res = await fetch(`${API_BASE}/api/analytics/segments`, {
      headers: this.headers()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
}

export default CampaignService;
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message"
}
```

**Common Error Codes:**
- `missing_org_id` - X-ORG-ID header not provided
- `validation_error` - Invalid request body
- `not_found` - Resource not found
- `tier_exists` - Winback tier already exists
- `analytics_not_enabled` - Analytics feature not enabled for org

---

## Important Notes

1. **Template IDs are read-only** - Templates are managed by admin, users can only see the assigned template name

2. **Date format for festivals** - Use "MM-DD" format (e.g., "12-25" for December 25)

3. **Time format** - Use 24-hour format (e.g., "10:00", "14:30")

4. **Days offset meaning:**
   - Negative = days before (e.g., -7 = 7 days before birthday)
   - Zero = on the day
   - Positive = days after

5. **Segment values:**
   - Frequency: `new`, `returning`, `loyal`, `vip`
   - Recency: `active`, `at_risk`, `lapsed`

6. **Winback tiers are sorted** - Tiers are automatically sorted by days ascending

7. **Analytics visibility** - Analytics endpoints may return 403 if analytics is not enabled for the org

---

## Testing

Use these org IDs for testing:
- `220006` - Test client with POS integration enabled

Test API calls:
```bash
# Get campaign config
curl -X GET "https://csat-cloud.vercel.app/api/campaign-config" \
  -H "X-ORG-ID: 220006"

# Update birthday settings
curl -X PATCH "https://csat-cloud.vercel.app/api/campaign-config/birthday" \
  -H "X-ORG-ID: 220006" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "daysOffset": -3}'

# Get analytics overview
curl -X GET "https://csat-cloud.vercel.app/api/analytics/overview" \
  -H "X-ORG-ID: 220006"
```

