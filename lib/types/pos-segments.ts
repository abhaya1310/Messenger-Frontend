export interface SegmentAudience {
    size?: number;
}

export interface PosSegment {
    _id: string;
    name: string;
    description?: string;
    audience?: SegmentAudience;
    updatedAt?: string;
}

export interface PosSegmentsListResponse {
    success: boolean;
    data: PosSegment[];
}
