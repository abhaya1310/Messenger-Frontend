export type SegmentStatus = 'draft' | 'active' | 'computing' | 'ready' | 'failed' | string;

export type NumericRule = {
    gt?: number;
    lt?: number;
    between?: [number, number];
};

export interface SegmentRules {
    visitCount?: NumericRule;
    totalSpend?: NumericRule;
    recencyDays?: NumericRule;

    birthdayWindowDays?: {
        before?: number;
        after?: number;
    };

    anniversaryWindowDays?: {
        before?: number;
        after?: number;
    };

    outlet?: {
        include?: string[];
        exclude?: string[];
    };

    excludeFlags?: {
        suspectedEmployee?: boolean;
        highFrequency?: boolean;
    };
}

export interface Segment {
    _id?: string;
    id?: string;
    name: string;
    rules?: SegmentRules;
    status?: SegmentStatus;
    estimatedSize?: number;
    lastComputedAt?: string;
    lastError?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SegmentsListResponse {
    success?: boolean;
    data?: {
        items?: Segment[];
        total?: number;
        limit?: number;
        skip?: number;
    };
    error?: string;
}

export interface SegmentResponse {
    success?: boolean;
    data?: Segment;
    error?: string;
    details?: any;
}
