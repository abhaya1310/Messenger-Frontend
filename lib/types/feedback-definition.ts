import type { TemplateVariableMappings } from "./template-variable-mapping";

export type FeedbackDefinitionStatus = "draft" | "published" | "archived";

export type WhatsAppTemplateCategory = "AUTHENTICATION" | "MARKETING" | "UTILITY";

export interface FeedbackDefinitionTemplatePreview {
    headerText?: string;
    bodyText?: string;
    footerText?: string;
    sampleValues?: Record<string, string>;
    message?: string;
}

export interface FeedbackDefinitionTemplate {
    name: string;
    language: string;
    category: WhatsAppTemplateCategory;
    componentsPreset?: unknown[];
    preview?: FeedbackDefinitionTemplatePreview;
}

export interface FeedbackDefinition {
    _id: string;
    key: string;
    name: string;
    description?: string;
    status: FeedbackDefinitionStatus;
    template: FeedbackDefinitionTemplate;
    templateVariableMappings?: TemplateVariableMappings;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FeedbackDefinitionListResponse {
    success: boolean;
    data: FeedbackDefinition[];
}

export interface FeedbackDefinitionSingleResponse {
    success: boolean;
    data: FeedbackDefinition;
}

export interface CreateFeedbackDefinitionRequest {
    key: string;
    name: string;
    description?: string;
    template: {
        name: string;
        language: string;
        category: WhatsAppTemplateCategory;
        componentsPreset: unknown[];
    };
    templateVariableMappings?: TemplateVariableMappings;
}

export interface UpdateFeedbackDefinitionRequest {
    key?: string;
    name?: string;
    description?: string;
    template?: {
        name?: string;
        language?: string;
        category?: WhatsAppTemplateCategory;
        componentsPreset?: unknown[];
    };
    templateVariableMappings?: TemplateVariableMappings;
}
