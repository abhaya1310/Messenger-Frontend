export type CampaignRunStatus = 'draft' | 'scheduled' | 'waiting_for_credits' | 'running' | 'completed' | 'cancelled' | 'failed';

export type CampaignAudienceSource = 'csv' | 'pos';

export interface CampaignDefinitionSummary {
    _id: string;
    key: string;
    name: string;
    description?: string;
    template?: {
        name: string;
        language?: string;
        category?: string;
    };
}

export interface CampaignRun {
    _id: string;
    orgId: string;
    campaignDefinitionId: CampaignDefinitionSummary;
    status: CampaignRunStatus;
    startDate: string;
    endDate: string;
    fireAt: string;
    audience: {
        source: CampaignAudienceSource;
        csv?: {
            originalFileName?: string;
            rowCount?: number;
            phoneNumbers?: string[];
        };
    };
    targetCount?: number;
    sentCount?: number;
    failedCount?: number;
    lastError?: string;
    creditsReserved?: number;
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
    startDate: string;
    endDate: string;
    fireAt: string;
    audience: {
        source: CampaignAudienceSource;
    };
}

export interface UpdateCampaignRunRequest {
    startDate?: string;
    endDate?: string;
    fireAt?: string;
    audience?: {
        source: CampaignAudienceSource;
    };
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
