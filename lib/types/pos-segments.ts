export interface SegmentAudience {
    size?: number;
}

export interface PosSegment {
    id?: string;
    _id?: string;
    name: string;
    status?: string;
    estimatedSize?: number;
    lastComputedAt?: string | null;
    lastError?: string | null;
    description?: string;
    audience?: SegmentAudience;
    updatedAt?: string;
}

export interface PosSegmentsListResponse {
    success: boolean;
    data: {
        items: PosSegment[];
        total?: number;
        limit?: number;
        skip?: number;
    };
}
