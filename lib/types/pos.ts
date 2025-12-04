// POS Customer and Transaction Types

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

// API Request/Response Types
export interface CustomerListParams {
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

export interface CustomerListResponse {
  customers: POSCustomer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerDetail extends Omit<POSCustomer, 'campaignHistory'> {
  transactions: POSTransaction[];
  campaignHistory: CampaignExecution[];
}

export interface CampaignExecution {
  campaignId: string;
  campaignName: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface TransactionListResponse {
  transactions: POSTransaction[];
  pagination: { total: number; page: number; limit: number };
}

// Sync Status
export interface SyncStatus {
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

