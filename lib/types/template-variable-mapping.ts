export type MappingSource = "customer" | "transaction" | "static";

export type TemplateVariableMapping =
    | { source: "customer"; path: string }
    | { source: "transaction"; path: string }
    | { source: "static"; value: string };

export type TemplateVariableMappings = Record<string, TemplateVariableMapping>;

export const CUSTOMER_FIELD_OPTIONS = [
    { label: "Customer Name", value: "name" },
    { label: "Customer Phone", value: "phone" },
    { label: "Customer Email", value: "email" },
    { label: "Total Visits", value: "visitMetrics.totalVisits" },
    { label: "Total Spend", value: "visitMetrics.totalSpend" },
    { label: "Avg Order Value", value: "visitMetrics.averageOrderValue" },
    { label: "Last Visit At", value: "visitMetrics.lastVisitAt" },
];

export const TRANSACTION_FIELD_OPTIONS = [
    { label: "Transaction Total Amount", value: "totalAmount" },
    { label: "Transaction Date", value: "transactionDate" },
    { label: "Transaction At", value: "transactionAt" },
];
