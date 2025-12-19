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
import type {
    CampaignDefinition,
    CampaignDefinitionStatus,
    CreateCampaignDefinitionRequest,
    UpdateCampaignDefinitionRequest,
    WhatsAppTemplateCategory,
} from "@/lib/types/campaign-definition";

type UpsertFormState = {
    key: string;
    name: string;
    description: string;
    templateName: string;
    templateLanguage: string;
    templateCategory: WhatsAppTemplateCategory;
    componentsPresetJson: string;
};

function defaultFormState(): UpsertFormState {
    return {
        key: "",
        name: "",
        description: "",
        templateName: "",
        templateLanguage: "en_US",
        templateCategory: "MARKETING",
        componentsPresetJson: "[]",
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

function parseComponentsPreset(json: string): { ok: true; value: unknown[] } | { ok: false; error: string } {
    try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return { ok: false, error: "componentsPreset must be a JSON array" };
        }
        return { ok: true, value: parsed };
    } catch {
        return { ok: false, error: "componentsPreset must be valid JSON" };
    }
}

export default function AdminCampaignDefinitionsClient() {
    const [definitions, setDefinitions] = useState<CampaignDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

            setDefinitions(((data as any)?.data || []) as CampaignDefinition[]);
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

    const openCreate = () => {
        setUpsertMode("create");
        setActiveId(null);
        setForm(defaultFormState());
        setShowUpsert(true);
    };

    const openEdit = (d: CampaignDefinition) => {
        setUpsertMode("edit");
        setActiveId(d._id);
        setForm({
            key: d.key,
            name: d.name,
            description: d.description || "",
            templateName: d.template?.name || "",
            templateLanguage: d.template?.language || "en_US",
            templateCategory: (d.template?.category || "MARKETING") as WhatsAppTemplateCategory,
            componentsPresetJson: safeJsonStringify(d.template?.componentsPreset || []),
        });
        setShowUpsert(true);
    };

    const submitUpsert = async () => {
        setError(null);

        if (!form.key.trim() || !form.name.trim() || !form.templateName.trim() || !form.templateLanguage.trim()) {
            setError("Please fill in all required fields");
            return;
        }

        const parsed = parseComponentsPreset(form.componentsPresetJson);
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }

        setSaving(true);
        try {
            const body: CreateCampaignDefinitionRequest | UpdateCampaignDefinitionRequest =
                upsertMode === "create"
                    ? ({
                        key: form.key.trim(),
                        name: form.name.trim(),
                        description: form.description.trim() || undefined,
                        template: {
                            name: form.templateName.trim(),
                            language: form.templateLanguage.trim(),
                            category: form.templateCategory,
                            componentsPreset: parsed.value,
                        },
                    } satisfies CreateCampaignDefinitionRequest)
                    : ({
                        key: form.key.trim(),
                        name: form.name.trim(),
                        description: form.description.trim() || undefined,
                        template: {
                            name: form.templateName.trim(),
                            language: form.templateLanguage.trim(),
                            category: form.templateCategory,
                            componentsPreset: parsed.value,
                        },
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

    const doAction = async (d: CampaignDefinition, action: "publish" | "archive" | "delete") => {
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
                                            <Button
                                                size="sm"
                                                onClick={() => doAction(d, "publish")}
                                                disabled={d.status !== "draft" || busy}
                                                className="gap-2"
                                            >
                                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                                Publish
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => doAction(d, "archive")}
                                                disabled={d.status === "archived" || busy}
                                            >
                                                Archive
                                            </Button>
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
                            The template preset is forwarded as-is to WhatsApp Cloud API. Provide valid media IDs in the preset.
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
                                onValueChange={(v) => {
                                    const selected = templateOptions.find((t) => t.name === v);
                                    setForm((p) => ({
                                        ...p,
                                        templateName: v,
                                        templateLanguage: selected?.language || p.templateLanguage,
                                        templateCategory: (selected?.category as WhatsAppTemplateCategory) || p.templateCategory,
                                    }));
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

                        <div className="space-y-2 md:col-span-2">
                            <Label>componentsPreset (JSON array) *</Label>
                            <Textarea
                                value={form.componentsPresetJson}
                                onChange={(e) => setForm((p) => ({ ...p, componentsPresetJson: e.target.value }))}
                                className="font-mono text-xs min-h-[220px]"
                            />
                        </div>
                    </div>

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
