export interface AdminOutlet {
    _id?: string;
    id?: string;
    outletId?: string;
    name?: string;
    displayName?: string;
    posOutletId?: string;
}

export interface AdminOutletsOrgResponse {
    success: boolean;
    data: unknown;
}
