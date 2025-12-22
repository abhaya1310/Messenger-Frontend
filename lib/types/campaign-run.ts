export type CampaignRunStatus =
    | 'draft'
    | 'scheduled'
    | 'running'
    | 'completed'
    | 'cancelled'
    | 'waiting_for_credits'
    | 'blocked_stale_segment'
    | 'needs_manual_review'
    | 'failed';

export type CampaignAudienceSource = 'segment' | 'csv' | 'pos';

export interface CampaignDefinitionSummaryPreview {
    headerText?: string;
    bodyText?: string;
    footerText?: string;
    sampleValues?: Record<string, string>;
    message?: string;
}

export interface CampaignDefinitionSummary {
    _id: string;
    key: string;
    name: string;
    description?: string;
    template?: {
        name: string;
        language?: string;
        category?: string;
        preview?: CampaignDefinitionSummaryPreview;
    };
}

export interface CampaignRun {
    _id: string;
    orgId: string;
    campaignDefinitionId: CampaignDefinitionSummary;
    name?: string;
    status: CampaignRunStatus;
    fireAt: string;
    templateParams?: Record<string, string>;
    audience: {
        source: CampaignAudienceSource;
        csv?: {
            originalFileName?: string;
            rowCount?: number;
            phoneNumbers?: string[];
        };
    };
    segmentId?: string;
    targetCount?: number;
    queuedCount?: number;
    sentCount?: number;
    failedCount?: number;
    lastError?: string;
    creditsReserved?: number;
    credits?: {
        reservedAmount?: number;
        debitedAmount?: number;
        releasedAmount?: number;
    };
    audienceSnapshot?: {
        snapshotId: string;
        totalCount: number;
        filteredCount: number;
        throttledCount?: number;
    };
    createdAt: string;
}

export interface CampaignRunCapabilitiesResponse {
    success: boolean;
    data: {
        posIntegrationEnabled: boolean;
    };
}

export interface CampaignRunDefinitionsResponse {
    success: boolean;
    data: CampaignDefinitionSummary[];
}

export interface CampaignRunsListResponse {
    success: boolean;
    data: CampaignRun[];
}

export interface CampaignRunSingleResponse {
    success: boolean;
    data: CampaignRun;
}

export interface CreateCampaignRunRequest {
    campaignDefinitionId: string;
    name?: string;
    fireAt: string;
    audience: {
        source: CampaignAudienceSource;
    };
    segmentId?: string;
    templateParams?: Record<string, string>;
}

export interface UpdateCampaignRunRequest {
    name?: string;
    fireAt?: string;
    audience?: {
        source: CampaignAudienceSource;
    };
    segmentId?: string;
    templateParams?: Record<string, string>;
}

export interface UploadCsvAudienceResponse {
    success: boolean;
    data: {
        validCount: number;
        invalidCount: number;
        totalRows: number;
        errors: string[];
    };
}
