export type OrderStatus = "ingested" | "duplicate" | "rejected" | string;

export interface OrderOutlet {
    id?: string;
    name?: string;
    posOutletId?: string;
}

export interface OrderGuest {
    name?: string;
    phone?: string;
}

export interface Order {
    id?: string;
    _id?: string;
    transactionId?: string;
    createdAt?: string;

    outlet?: OrderOutlet;
    guest?: OrderGuest;

    totalAmount?: number;
    paymentMethod?: string;

    source?: "POS" | string;
    status?: OrderStatus;
}

export interface OrdersListResponse {
    success?: boolean;
    data?: Order[];
    orders?: Order[];
    error?: string;
}
