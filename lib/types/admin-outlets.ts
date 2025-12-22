export interface AdminOutlet {
    _id?: string;
    id?: string;
    outletId?: string;
    orgId?: string;
    name?: string;
    displayName?: string;
    address?: string | null;
    posOutletId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminOutletsListResponse {
    success: boolean;
    data: AdminOutlet[];
}

export interface AdminOutletCreateRequest {
    name: string;
    address?: string;
    posOutletId?: string;
}

export interface AdminOutletCreateResponse {
    success: boolean;
    data: AdminOutlet;
    error?: string;
}

export interface AdminOutletPosUpdateRequest {
    posOutletId: string | null;
}

export interface AdminOutletPosUpdateResponse {
    success: boolean;
    outletId: string;
    posOutletId: string | null;
    error?: string;
}

export interface AdminOrgPosStatusResponse {
    success: boolean;
    data: {
        status: 'active' | 'paused' | 'error' | string;
        lastIngestedAt: string | null;
        error: string | null;
        mappedOutlets: Array<{ _id: string; name: string; posOutletId: string }>;
        unmappedOutletsCount: number;
        lastRejectedOrder: {
            at: string;
            reason: string;
            outletId: string;
            transactionId: string;
            restaurantId: string;
        } | null;
    };
}
