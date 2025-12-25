"use client";

import { useEffect, useMemo, useState } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Megaphone, Plus, RefreshCw, Search, Trash2, UploadCloud } from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import type { Template } from "@/lib/api";
import { TemplateVariableMapper, validateTemplateVariableMappings } from "@/components/template-variable-mapper";
import { MessagePreview } from "@/components/message-preview";
import type {
    CampaignDefinition,
    CampaignDefinitionStatus,
    CreateCampaignDefinitionRequest,
    UpdateCampaignDefinitionRequest,
    WhatsAppTemplateCategory,
} from "@/lib/types/campaign-definition";
import type { TemplateVariableMappings } from "@/lib/types/template-variable-mapping";
import { CUSTOMER_FIELD_OPTIONS, TRANSACTION_FIELD_OPTIONS } from "@/lib/types/template-variable-mapping";

type TemplateVariable = {
    index: number;
    label: string;
    context?: string;
};

function substituteTemplateText(params: {
    text?: string;
    sampleValues: Record<string, string>;
    mappings: TemplateVariableMappings;
}): string {
    const raw = params.text || "";
    if (!raw) return "";

    return raw.replace(/\{\{(\d+)\}\}/g, (_match, idxRaw) => {
        const idx = String(idxRaw);
        const dummy = params.sampleValues?.[idx];
        if (dummy && String(dummy).trim()) return String(dummy);

        const mapping = params.mappings?.[idx];
        if (!mapping) return `{{${idx}}}`;

        if (mapping.source === "customer") return `[customer.${mapping.path}]`;
        if (mapping.source === "transaction") return `[transaction.${mapping.path}]`;
        return "[user input]";
    });
}

type UpsertFormState = {
    key: string;
    name: string;
    description: string;
    templateName: string;
    templateLanguage: string;
    templateCategory: WhatsAppTemplateCategory;
    variables: TemplateVariable[];
    sampleValues: Record<string, string>;
    templateVariableMappings: TemplateVariableMappings;
};

function defaultFormState(): UpsertFormState {
    return {
        key: "",
        name: "",
        description: "",
        templateName: "",
        templateLanguage: "en_US",
        templateCategory: "MARKETING",
        variables: [],
        sampleValues: {},
        templateVariableMappings: {},
    };
}

function badgeVariantForStatus(status: CampaignDefinitionStatus) {
    switch (status) {
        case "published":
            return "success" as const;
        case "draft":
            return "secondary" as const;
        case "archived":
            return "outline" as const;
        default:
            return "outline" as const;
    }
}

function safeJsonStringify(value: unknown) {
    try {
        return JSON.stringify(value ?? [], null, 2);
    } catch {
        return "[]";
    }
}

function extractTemplateVariableMappings(definition: CampaignDefinition): TemplateVariableMappings {
    const d: any = definition as any;
    return (
        d?.templateVariableMappings ||
        d?.template_variable_mappings ||
        d?.template?.templateVariableMappings ||
        d?.template?.template_variable_mappings ||
        d?.template?.preview?.templateVariableMappings ||
        d?.template?.preview?.template_variable_mappings ||
        {}
    );
}

export default function AdminCampaignDefinitionsClient() {
    const [definitions, setDefinitions] = useState<CampaignDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [analyzeError, setAnalyzeError] = useState<string | null>(null);

    const [templates, setTemplates] = useState<Template[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templatesError, setTemplatesError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<CampaignDefinitionStatus | "all">("all");

    const [showUpsert, setShowUpsert] = useState(false);
    const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [form, setForm] = useState<UpsertFormState>(defaultFormState());
    const [saving, setSaving] = useState(false);

    const [mappingInvalidIndices, setMappingInvalidIndices] = useState<number[]>([]);

    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const templateOptions = useMemo(() => {
        const approved = templates.filter((t) => t.status === "APPROVED");
        const base = (approved.length > 0 ? approved : templates)
            .slice()
            .sort((a, b) => `${a.category}:${a.name}`.localeCompare(`${b.category}:${b.name}`));

        const current = form.templateName.trim();
        if (!current) return base.map((t) => ({ name: t.name, category: t.category, language: t.language }));

        const exists = base.some((t) => t.name === current);
        const out = exists
            ? base
            : [
                {
                    name: current,
                    category: form.templateCategory,
                    language: form.templateLanguage,
                } as unknown as Template,
                ...base,
            ];

        return out.map((t) => ({ name: t.name, category: t.category, language: t.language }));
    }, [templates, form.templateName, form.templateCategory, form.templateLanguage]);

    const selectedTemplateForPreview = useMemo(() => {
        if (!form.templateName) return null;
        return (
            templates.find((t) => t.name === form.templateName && t.language === form.templateLanguage) ||
            templates.find((t) => t.name === form.templateName) ||
            null
        );
    }, [templates, form.templateName, form.templateLanguage]);

    const previewParts = useMemo(() => {
        const components: any[] = (selectedTemplateForPreview as any)?.components || [];
        const headerText = components.find((c) => c.type === "HEADER" && c.format === "TEXT" && typeof c.text === "string")?.text;
        const bodyText = components.find((c) => c.type === "BODY" && typeof c.text === "string")?.text;
        const footerText = components.find((c) => c.type === "FOOTER" && typeof c.text === "string")?.text;

        return {
            headerText,
            bodyText,
            footerText,
        };
    }, [selectedTemplateForPreview]);

    const previewText = useMemo(() => {
        const header = substituteTemplateText({
            text: previewParts.headerText,
            sampleValues: form.sampleValues,
            mappings: form.templateVariableMappings,
        });
        const body = substituteTemplateText({
            text: previewParts.bodyText,
            sampleValues: form.sampleValues,
            mappings: form.templateVariableMappings,
        });
        const footer = substituteTemplateText({
            text: previewParts.footerText,
            sampleValues: form.sampleValues,
            mappings: form.templateVariableMappings,
        });

        return [header, body, footer].filter(Boolean).join("\n\n");
    }, [previewParts.headerText, previewParts.bodyText, previewParts.footerText, form.sampleValues, form.templateVariableMappings]);

    const filtered = useMemo(() => {
        return definitions
            .filter((d) => (statusFilter === "all" ? true : d.status === statusFilter))
            .filter((d) => {
                const q = searchQuery.trim().toLowerCase();
                if (!q) return true;
                return (
                    d.name.toLowerCase().includes(q) ||
                    d.key.toLowerCase().includes(q) ||
                    (d.description || "").toLowerCase().includes(q)
                );
            });
    }, [definitions, searchQuery, statusFilter]);

    const load = async () => {
        setError(null);
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.set("status", statusFilter);

            const token = getAuthToken();
            const res = await fetch(`/api/admin/campaign-definitions?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const message = (data as any)?.error || (data as any)?.message || "Failed to load campaign definitions";
                throw new Error(message);
            }

            const raw = (((data as any)?.data || []) as CampaignDefinition[]) ?? [];
            setDefinitions(
                raw.map((d) => ({
                    ...d,
                    templateVariableMappings: extractTemplateVariableMappings(d),
                }))
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load campaign definitions");
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async () => {
        setTemplatesError(null);
        setTemplatesLoading(true);
        try {
            const token = getAuthToken();
            const res = await fetch("/api/templates?limit=200", {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                if (res.status === 401) {
                    setTemplatesError("Session expired (401). Please login again.");
                    setTemplates([]);
                    return;
                }
                if (res.status === 403) {
                    setTemplatesError("Forbidden (403): admin access required.");
                    setTemplates([]);
                    return;
                }

                const message = (data as any)?.error || (data as any)?.message || "Failed to load templates";
                throw new Error(message);
            }

            setTemplates((((data as any)?.data || []) as Template[]) ?? []);
        } catch (e) {
            setTemplates([]);
            setTemplatesError(e instanceof Error ? e.message : "Failed to load templates");
        } finally {
            setTemplatesLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    useEffect(() => {
        loadTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const extractAnalyzeVariables = (payload: any): TemplateVariable[] => {
        const vars = payload?.data?.variables ?? payload?.variables;
        return Array.isArray(vars)
            ? (vars as any[]).map((v) => ({
                index: Number((v as any)?.index),
                label: String((v as any)?.label || ""),
                context: typeof (v as any)?.context === "string" ? (v as any).context : "",
            }))
            : [];
    };

    const openCreate = () => {
        setUpsertMode("create");
        setActiveId(null);
        setForm(defaultFormState());
        setAnalyzeError(null);
        setMappingInvalidIndices([]);
        setShowUpsert(true);
    };

    const openEdit = async (d: CampaignDefinition) => {
        setUpsertMode("edit");
        setActiveId(d._id);
        setAnalyzeError(null);
        setMappingInvalidIndices([]);

        const normalizedMappings = extractTemplateVariableMappings(d);

        const baseForm: UpsertFormState = {
            key: d.key,
            name: d.name,
            description: d.description || "",
            templateName: d.template?.name || "",
            templateLanguage: d.template?.language || "en_US",
            templateCategory: d.template?.category || "MARKETING",
            variables: [],
            sampleValues: d.template?.preview?.sampleValues || {},
            templateVariableMappings: normalizedMappings,
        };

        setForm(baseForm);
        setShowUpsert(true);

        if (!baseForm.templateName) {
            return;
        }

        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch("/api/templates/analyze", {
                method: "POST",
                headers,
                body: JSON.stringify({ templateName: baseForm.templateName }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data) {
                console.error("/api/templates/analyze failed", { status: res.status, data });
                setAnalyzeError("Failed to analyze template variables.");
                return;
            }
            if (!data?.success) {
                console.error("/api/templates/analyze returned success=false", data);
                setAnalyzeError((data as any)?.error || (data as any)?.message || "Failed to analyze template variables.");
                return;
            }

            const vars = extractAnalyzeVariables(data);
            if (vars.length === 0) {
                setAnalyzeError("No variables detected for this template.");
            }
            setForm((p) => ({
                ...p,
                variables: vars,
                sampleValues: vars.reduce<Record<string, string>>((acc, variable) => {
                    const key = String(variable.index);
                    acc[key] = p.sampleValues?.[key] || "";
                    return acc;
                }, {}),
                templateVariableMappings: p.templateVariableMappings || {},
            }));
        } catch {
            console.error("/api/templates/analyze error");
            setAnalyzeError("Failed to analyze template variables.");
        }
    };

    const submitUpsert = async () => {
        setError(null);
        setMappingInvalidIndices([]);

        if (!form.key.trim() || !form.name.trim() || !form.templateName.trim() || !form.templateLanguage.trim()) {
            setError("Please fill in all required fields");
            return;
        }

        if (form.variables.length > 0) {
            const validation = validateTemplateVariableMappings({
                templateVariables: form.variables.map((v) => ({ index: v.index })),
                mappings: form.templateVariableMappings || {},
            });
            if (!validation.ok) {
                setMappingInvalidIndices(validation.invalidIndices);
                setError("Please complete variable mappings before saving");
                return;
            }
        }

        setSaving(true);
        try {
            const selectedTemplate = templates.find(
                (t) => t.name === form.templateName && t.language === form.templateLanguage
            );

            const components: any[] = (selectedTemplate as any)?.components || [];
            const headerText = components.find(
                (c) => c.type === "HEADER" && c.format === "TEXT" && typeof c.text === "string"
            )?.text;
            const bodyText = components.find(
                (c) => c.type === "BODY" && typeof c.text === "string"
            )?.text;
            const footerText = components.find(
                (c) => c.type === "FOOTER" && typeof c.text === "string"
            )?.text;

            const templatePayload: any = {
                name: form.templateName.trim(),
                language: form.templateLanguage.trim(),
                category: form.templateCategory,
                preview: {
                    headerText,
                    bodyText,
                    footerText,
                    sampleValues: form.sampleValues,
                },
            };

            const body: CreateCampaignDefinitionRequest | UpdateCampaignDefinitionRequest =
                upsertMode === "create"
                    ? ({
                        key: form.key.trim(),
                        name: form.name.trim(),
                        description: form.description.trim() || undefined,
                        template: templatePayload,
                        templateVariableMappings: form.templateVariableMappings,
                    } satisfies CreateCampaignDefinitionRequest)
                    : ({
                        key: form.key.trim(),
                        name: form.name.trim(),
                        description: form.description.trim() || undefined,
                        template: templatePayload,
                        templateVariableMappings: form.templateVariableMappings,
                    } satisfies UpdateCampaignDefinitionRequest);

            const token = getAuthToken();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(
                upsertMode === "create"
                    ? "/api/admin/campaign-definitions"
                    : `/api/admin/campaign-definitions/${encodeURIComponent(activeId || "")}`,
                {
                    method: upsertMode === "create" ? "POST" : "PATCH",
                    headers,
                    body: JSON.stringify(body),
                }
            );

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const message = (data as any)?.error || (data as any)?.message || "Failed to save definition";
                throw new Error(message);
            }

            setShowUpsert(false);
            setActiveId(null);
            setForm(defaultFormState());
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save definition");
        } finally {
            setSaving(false);
        }
    };

    const doAction = async (d: CampaignDefinition, action: "publish" | "unpublish" | "archive" | "unarchive" | "delete") => {
        setError(null);
        setActionLoadingId(d._id);
        try {
            const token = getAuthToken();
            const url =
                action === "delete"
                    ? `/api/admin/campaign-definitions/${encodeURIComponent(d._id)}`
                    : `/api/admin/campaign-definitions/${encodeURIComponent(d._id)}/${action}`;

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(url, {
                method: action === "delete" ? "DELETE" : "POST",
                headers,
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const message = (data as any)?.error || (data as any)?.message || `Failed to ${action}`;
                throw new Error(message);
            }

            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Action failed");
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-start justify-between gap-4 py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Campaign Catalog</h1>
                            <p className="text-gray-600 mt-1">Create reusable campaign definitions for users to run.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onRefresh} disabled={refreshing || loading} className="gap-2">
                                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Refresh
                            </Button>
                            <Button onClick={openCreate} className="gap-2">
                                <Plus className="h-4 w-4" />
                                New Definition
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Campaigns" }]} />

                {error && (
                    <Card className="mb-6 border-destructive/30">
                        <CardContent className="pt-6">
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[240px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by name or key..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No campaign definitions</h3>
                                <p className="text-gray-500 mb-4">Create your first definition to populate the catalog.</p>
                                <Button onClick={openCreate} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    New Definition
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filtered.map((d) => {
                            const busy = actionLoadingId === d._id;
                            return (
                                <Card key={d._id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <CardTitle className="text-lg truncate">{d.name}</CardTitle>
                                                <div className="mt-1 text-sm text-gray-600 break-all">{d.key}</div>
                                                {d.description && <CardDescription className="mt-1">{d.description}</CardDescription>}
                                            </div>
                                            <Badge variant={badgeVariantForStatus(d.status)} className="capitalize">
                                                {d.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <div className="text-gray-500">Template</div>
                                                <div className="font-medium break-all">{d.template?.name || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Language</div>
                                                <div className="font-medium">{d.template?.language || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Category</div>
                                                <div className="font-medium">{d.template?.category || "—"}</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEdit(d)}
                                                disabled={d.status !== "draft" || busy}
                                            >
                                                Edit
                                            </Button>

                                            {d.status === "draft" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => doAction(d, "publish")}
                                                    disabled={busy}
                                                    className="gap-2"
                                                >
                                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                                    Publish
                                                </Button>
                                            )}

                                            {d.status === "published" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => doAction(d, "unpublish")}
                                                    disabled={busy}
                                                >
                                                    Unpublish
                                                </Button>
                                            )}

                                            {d.status === "archived" ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => doAction(d, "unarchive")}
                                                    disabled={busy}
                                                >
                                                    Unarchive
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => doAction(d, "archive")}
                                                    disabled={busy}
                                                >
                                                    Archive
                                                </Button>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 gap-2"
                                                onClick={() => doAction(d, "delete")}
                                                disabled={d.status !== "draft" || busy}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>

            <Dialog open={showUpsert} onOpenChange={setShowUpsert}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{upsertMode === "create" ? "New Campaign Definition" : "Edit Campaign Definition"}</DialogTitle>
                        <DialogDescription>
                            Select a WhatsApp template, configure sample values for its variables, and save a preview that will be shown in the
                            campaign catalog.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label>Key *</Label>
                            <Input value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                        </div>

                        <div className="space-y-2">
                            <Label>Template Name *</Label>
                            <Select
                                value={form.templateName}
                                onValueChange={async (v) => {
                                    const selected = templateOptions.find((t) => t.name === v);

                                    const shouldReset =
                                        Object.keys(form.templateVariableMappings || {}).length > 0 &&
                                        form.templateName.trim() &&
                                        form.templateName.trim() !== v;

                                    if (shouldReset) {
                                        const ok = window.confirm(
                                            "Template changed; mappings may not match. Reset mappings?"
                                        );
                                        if (!ok) {
                                            return;
                                        }
                                    }

                                    setForm((p) => ({
                                        ...p,
                                        templateName: v,
                                        templateLanguage: selected?.language || p.templateLanguage,
                                        templateCategory: (selected?.category as WhatsAppTemplateCategory) || p.templateCategory,
                                        variables: [],
                                        sampleValues: {},
                                        templateVariableMappings: shouldReset ? {} : p.templateVariableMappings,
                                    }));

                                    setAnalyzeError(null);
                                    setMappingInvalidIndices([]);

                                    try {
                                        const token = getAuthToken();
                                        const headers: Record<string, string> = { "Content-Type": "application/json" };
                                        if (token) headers.Authorization = `Bearer ${token}`;

                                        const res = await fetch("/api/templates/analyze", {
                                            method: "POST",
                                            headers,
                                            body: JSON.stringify({ templateName: v }),
                                        });

                                        const data = await res.json().catch(() => null);
                                        if (!res.ok || !data) {
                                            console.error("/api/templates/analyze failed", { status: res.status, data });
                                            setAnalyzeError("Failed to analyze template variables.");
                                            return;
                                        }
                                        if (!data?.success) {
                                            console.error("/api/templates/analyze returned success=false", data);
                                            setAnalyzeError(
                                                (data as any)?.error || (data as any)?.message || "Failed to analyze template variables."
                                            );
                                            return;
                                        }

                                        const vars = extractAnalyzeVariables(data);
                                        if (vars.length === 0) {
                                            setAnalyzeError("No variables detected for this template.");
                                        }
                                        setForm((p) => ({
                                            ...p,
                                            variables: vars,
                                            sampleValues: vars.reduce<Record<string, string>>((acc, variable) => {
                                                const key = String(variable.index);
                                                acc[key] = p.sampleValues?.[key] || "";
                                                return acc;
                                            }, {}),
                                            templateVariableMappings: shouldReset ? {} : p.templateVariableMappings,
                                        }));
                                    } catch {
                                        console.error("/api/templates/analyze error");
                                        setAnalyzeError("Failed to analyze template variables.");
                                    }
                                }}
                                disabled={templatesLoading || templateOptions.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            templatesLoading
                                                ? "Loading templates..."
                                                : templateOptions.length === 0
                                                    ? "No templates available"
                                                    : "Select a template"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {templateOptions.map((t) => (
                                        <SelectItem key={`${t.name}:${t.language}:${t.category}`} value={t.name}>
                                            {t.name} — {t.category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {templatesError && (
                                <p className="text-sm text-destructive" role="alert">
                                    {templatesError}
                                </p>
                            )}

                            {analyzeError && (
                                <p className="text-sm text-destructive" role="alert">
                                    {analyzeError}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Template Language *</Label>
                            <Input
                                value={form.templateLanguage}
                                onChange={(e) => setForm((p) => ({ ...p, templateLanguage: e.target.value }))}
                                placeholder="e.g. en_US"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category *</Label>
                            <Input value={form.templateCategory} disabled />
                        </div>
                    </div>

                    {form.variables.length > 0 && (
                        <div className="mt-6 border-t pt-4 space-y-3">
                            <h3 className="text-sm font-medium text-gray-900">Template Variables</h3>
                            <p className="text-xs text-gray-500">
                                Provide dummy values for preview. These are shown to end-users as an example.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {form.variables.map((v) => {
                                    const key = String(v.index);
                                    return (
                                        <div key={key} className="space-y-1">
                                            <div className="text-xs font-medium text-gray-700">
                                                Variable {v.index}
                                                {v.label ? ` — ${v.label}` : ""}
                                            </div>
                                            <Input
                                                placeholder="Dummy value"
                                                value={form.sampleValues[key] || ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setForm((p) => ({
                                                        ...p,
                                                        sampleValues: {
                                                            ...p.sampleValues,
                                                            [key]: value,
                                                        },
                                                    }));
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {form.templateName && previewText ? (
                        <div className="mt-6 border-t pt-4 space-y-3">
                            <h3 className="text-sm font-medium text-gray-900">Template Preview</h3>
                            <p className="text-xs text-gray-500">
                                Preview uses your dummy values. For mapped fields, we show a placeholder like [customer.name].
                            </p>
                            <MessagePreview templateName={form.templateName} language={form.templateLanguage} preview={previewText} />
                        </div>
                    ) : null}

                    {form.variables.length > 0 && (
                        <div className="mt-6 border-t pt-4">
                            <TemplateVariableMapper
                                templateVariables={form.variables.map((v) => ({
                                    index: v.index,
                                    label: v.label,
                                    context: v.context || "",
                                    required: true,
                                }))}
                                value={form.templateVariableMappings || {}}
                                onChange={(next) => setForm((p) => ({ ...p, templateVariableMappings: next }))}
                                customerOptions={CUSTOMER_FIELD_OPTIONS}
                                transactionOptions={TRANSACTION_FIELD_OPTIONS}
                                invalidIndices={mappingInvalidIndices}
                            />
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowUpsert(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={submitUpsert} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
