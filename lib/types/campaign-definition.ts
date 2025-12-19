export type CampaignDefinitionStatus = 'draft' | 'published' | 'archived';

export type WhatsAppTemplateCategory = 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';

export interface CampaignDefinitionTemplatePreview {
    headerText?: string;
    bodyText?: string;
    footerText?: string;
    sampleValues?: Record<string, string>;
    message?: string;
}

export interface CampaignDefinitionTemplate {
    name: string;
    language: string;
    category: WhatsAppTemplateCategory;
    componentsPreset?: unknown[];
    preview?: CampaignDefinitionTemplatePreview;
}

export interface CampaignDefinition {
    _id: string;
    key: string;
    name: string;
    description?: string;
    status: CampaignDefinitionStatus;
    template: CampaignDefinitionTemplate;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CampaignDefinitionListResponse {
    success: boolean;
    data: CampaignDefinition[];
}

export interface CampaignDefinitionSingleResponse {
    success: boolean;
    data: CampaignDefinition;
}

export interface CreateCampaignDefinitionRequest {
    key: string;
    name: string;
    description?: string;
    template: {
        name: string;
        language: string;
        category: WhatsAppTemplateCategory;
        componentsPreset: unknown[];
    };
}

export interface UpdateCampaignDefinitionRequest {
    key?: string;
    name?: string;
    description?: string;
    template?: {
        name?: string;
        language?: string;
        category?: WhatsAppTemplateCategory;
        componentsPreset?: unknown[];
    };
}
