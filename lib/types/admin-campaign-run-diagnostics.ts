export interface AdminCampaignRunDiagnostics {
    runId: string;
    status?: string;
    queuedCount?: number;
    sentCount?: number;
    failedCount?: number;
    segmentId?: string;
    snapshotId?: string;
    credits?: {
        reservedAmount?: number;
        debitedAmount?: number;
        releasedAmount?: number;
    };
    inconsistencies?: string[];
}

export interface AdminCampaignRunDiagnosticsResponse {
    success: boolean;
    data: AdminCampaignRunDiagnostics;
    error?: string;
    message?: string;
}
