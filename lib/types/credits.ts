export type CreditsBucket = 'utility' | 'marketing';

export interface CreditsBucketBalances {
    utility: number;
    marketing: number;
}

export interface CreditsState {
    balances: CreditsBucketBalances;
    reserved: CreditsBucketBalances;
    available: CreditsBucketBalances;
}

export interface CreditsMeResponse {
    success: true;
    data: CreditsState;
}

export type CampaignRunCreditsPrecheckInsufficientReason = 'partial_credits' | string;

export interface CampaignRunCreditsPrecheck {
    runId: string;
    orgId: string;
    templateName: string;
    templateCategory: string;
    bucket: CreditsBucket;
    totalAudienceCount: number;
    throttledCount: number;
    eligibleCount: number;
    creditsRequired: number;
    creditsAvailable: number;
    isSufficient: boolean;
    insufficientReason?: CampaignRunCreditsPrecheckInsufficientReason;
    audienceSource: string;
}

export interface CampaignRunCreditsPrecheckResponse {
    success: true;
    data: CampaignRunCreditsPrecheck;
}

export interface InsufficientCreditsErrorResponse {
    success: false;
    error: string;
    code: 'INSUFFICIENT_CREDITS' | string;
    data?: {
        creditsRequired: number;
        creditsAvailable: number;
        bucket: CreditsBucket;
        eligibleCount?: number;
        throttledCount?: number;
        insufficientReason?: CampaignRunCreditsPrecheckInsufficientReason;
    };
}

export type CreditsLedgerEventType = 'debit' | 'refill' | 'reserve' | 'consume' | 'release';

export interface CreditsLedgerEntry {
    _id: string;
    createdAt: string;
    type: CreditsLedgerEventType;
    bucket: CreditsBucket;
    amount: number;
    note?: string;
    campaignRunId?: string;
    reservedAfter?: number;
    balanceAfter?: number;
}

export interface CreditsLedgerResponse {
    success: boolean;
    data: {
        items: CreditsLedgerEntry[];
        limit: number;
        skip: number;
        total?: number;
    };
}

export interface AdminOrgCreditsResponse {
    success: true;
    data: CreditsState;
}

export interface AdminCreditsRefillRequest {
    bucket: CreditsBucket;
    amount: number;
    idempotencyKey?: string;
    note?: string;
}

export interface AdminCreditsRefillResponse {
    success: true;
    data: CreditsState & {
        alreadyRefilled?: boolean;
    };
}
