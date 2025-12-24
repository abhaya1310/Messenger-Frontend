"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, ThumbsUp } from "lucide-react";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { setSelectedOrgId } from "@/lib/selected-org";
import type { Template } from "@/lib/api";
import type { UtilityConfig } from "@/lib/types/campaign";
import type { TemplateVariableMappings } from "@/lib/types/template-variable-mapping";
import { CUSTOMER_FIELD_OPTIONS, TRANSACTION_FIELD_OPTIONS } from "@/lib/types/template-variable-mapping";
import { TemplateVariableMapper, validateTemplateVariableMappings } from "@/components/template-variable-mapper";

type AnalyzeVariable = { index: number; context?: string; label?: string };

type CampaignConfigResponse = {
    success: boolean;
    data: {
        utility?: UtilityConfig;
    };
};

type TemplateAnalyzeResponse = {
    success: boolean;
    data?: {
        variables?: AnalyzeVariable[];
    };
    variables?: AnalyzeVariable[];
    error?: string;
    message?: string;
};

export default function AdminOrgFeedbackPage() {
    const params = useParams<{ orgId: string }>();
    const orgId = params.orgId;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [templates, setTemplates] = useState<Template[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templatesError, setTemplatesError] = useState<string | null>(null);

    const [enabled, setEnabled] = useState(false);
    const [delayMinutes, setDelayMinutes] = useState(60);
    const [templateId, setTemplateId] = useState<string>("");

    const [variables, setVariables] = useState<AnalyzeVariable[]>([]);
    const [templateVariableMappings, setTemplateVariableMappings] = useState<TemplateVariableMappings>({});
    const [mappingInvalidIndices, setMappingInvalidIndices] = useState<number[]>([]);

    const templateOptions = useMemo(() => {
        const approved = templates.filter((t) => t.status === "APPROVED");
        const base = (approved.length > 0 ? approved : templates)
            .slice()
            .sort((a, b) => `${a.category}:${a.name}`.localeCompare(`${b.category}:${b.name}`));
        return base.map((t) => ({ name: t.name, category: t.category, language: t.language }));
    }, [templates]);

    const extractAnalyzeVariables = (payload: any): AnalyzeVariable[] => {
        const vars = payload?.data?.variables ?? payload?.variables;
        return Array.isArray(vars) ? (vars as AnalyzeVariable[]) : [];
    };

    const loadTemplates = async () => {
        setTemplatesError(null);
        setTemplatesLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${encodeURIComponent(orgId)}/feedback`)}`);
                return;
            }

            const res = await fetch("/api/templates?limit=200", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${encodeURIComponent(orgId)}/feedback`)}`);
                    return;
                }
                const msg = (data as any)?.error || (data as any)?.message || "Failed to load templates";
                throw new Error(msg);
            }

            setTemplates((((data as any)?.data || []) as Template[]) ?? []);
        } catch (e) {
            setTemplates([]);
            setTemplatesError(e instanceof Error ? e.message : "Failed to load templates");
        } finally {
            setTemplatesLoading(false);
        }
    };

    const loadConfig = async () => {
        setError(null);
        setLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${encodeURIComponent(orgId)}/feedback`)}`);
                return;
            }

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/campaign-config`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = (await res.json().catch(() => null)) as CampaignConfigResponse | null;
            if (!res.ok) {
                const msg = (data as any)?.error || (data as any)?.message || "Failed to load campaign config";
                throw new Error(msg);
            }

            const feedback = (data as any)?.data?.utility?.feedback;
            setEnabled(!!feedback?.enabled);
            setDelayMinutes(typeof feedback?.delayMinutes === "number" ? feedback.delayMinutes : 60);
            setTemplateId(typeof feedback?.templateId === "string" ? feedback.templateId : "");
            setTemplateVariableMappings((feedback?.templateVariableMappings || {}) as TemplateVariableMappings);

            if (typeof feedback?.templateId === "string" && feedback.templateId.trim()) {
                await analyzeTemplate(feedback.templateId);
            } else {
                setVariables([]);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load feedback config");
        } finally {
            setLoading(false);
        }
    };

    const analyzeTemplate = async (name: string) => {
        setMappingInvalidIndices([]);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch("/api/templates/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ templateName: name }),
            });

            const data = (await res.json().catch(() => null)) as TemplateAnalyzeResponse | null;
            if (!res.ok || !data) {
                throw new Error("Failed to analyze template variables.");
            }
            if (!(data as any)?.success) {
                const msg = (data as any)?.error || (data as any)?.message || "Failed to analyze template variables.";
                throw new Error(msg);
            }

            const vars = extractAnalyzeVariables(data);
            setVariables(vars);
        } catch (e) {
            setVariables([]);
            setError(e instanceof Error ? e.message : "Failed to analyze template variables");
        }
    };

    const onSave = async () => {
        setError(null);
        setMappingInvalidIndices([]);

        if (enabled) {
            if (!templateId.trim()) {
                setError("Please select a template before enabling feedback");
                return;
            }

            if (variables.length > 0) {
                const validation = validateTemplateVariableMappings({
                    templateVariables: variables.map((v) => ({ index: v.index })),
                    mappings: templateVariableMappings || {},
                });
                if (!validation.ok) {
                    setMappingInvalidIndices(validation.invalidIndices);
                    setError("Please complete variable mappings before saving");
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const payload = {
                feedback: {
                    enabled,
                    delayMinutes,
                    templateId: templateId.trim(),
                    templateVariableMappings: templateVariableMappings || {},
                },
            };

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/campaign-config/utility`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = (data as any)?.error || (data as any)?.message || "Failed to save feedback config";
                throw new Error(msg);
            }

            await loadConfig();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save feedback config");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        setSelectedOrgId(orgId);
        loadTemplates();
        loadConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-start justify-between gap-4 py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
                            <p className="text-gray-600 mt-1">Configure feedback service template + variable mapping.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={loadConfig} disabled={saving} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </Button>
                            <Button onClick={onSave} disabled={saving} className="gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Orgs", href: "/admin/orgs" }, { label: orgId, href: `/admin/orgs/${encodeURIComponent(orgId)}` }, { label: "Feedback" }]} />

                {error && (
                    <Card className="border-destructive/30">
                        <CardContent className="pt-6">
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Feedback service</CardTitle>
                        <CardDescription>Enable feedback requests and choose which template to use.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm">Enabled</Label>
                                <p className="text-xs text-muted-foreground">When enabled, feedback requests will be scheduled after transactions.</p>
                            </div>
                            <Switch checked={enabled} onCheckedChange={setEnabled} disabled={saving} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Delay minutes</Label>
                                <Select value={String(delayMinutes)} onValueChange={(v) => setDelayMinutes(parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select delay" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                        <SelectItem value="60">1 hour</SelectItem>
                                        <SelectItem value="120">2 hours</SelectItem>
                                        <SelectItem value="240">4 hours</SelectItem>
                                        <SelectItem value="1440">24 hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Template *</Label>
                                <Select
                                    value={templateId}
                                    onValueChange={async (v) => {
                                        const shouldReset =
                                            Object.keys(templateVariableMappings || {}).length > 0 &&
                                            templateId.trim() &&
                                            templateId.trim() !== v;

                                        if (shouldReset) {
                                            const ok = window.confirm("Template changed; mappings may not match. Reset mappings?");
                                            if (!ok) return;
                                        }

                                        setTemplateId(v);
                                        if (shouldReset) {
                                            setTemplateVariableMappings({});
                                        }
                                        setVariables([]);
                                        setMappingInvalidIndices([]);
                                        await analyzeTemplate(v);
                                    }}
                                    disabled={templatesLoading || templateOptions.length === 0 || saving}
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
                        </div>

                        {enabled && templateId.trim() && (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-sm">Sample preview values</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Keep using sample values preview elsewhere; this page focuses on live mapping.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Template</Label>
                                        <Input value={templateId} disabled />
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {enabled && variables.length > 0 && (
                    <TemplateVariableMapper
                        templateVariables={variables.map((v) => ({
                            index: v.index,
                            label: v.label || "",
                            context: v.context || "",
                            required: true,
                        }))}
                        value={templateVariableMappings}
                        onChange={setTemplateVariableMappings}
                        customerOptions={CUSTOMER_FIELD_OPTIONS}
                        transactionOptions={TRANSACTION_FIELD_OPTIONS}
                        invalidIndices={mappingInvalidIndices}
                    />
                )}

                {enabled && variables.length === 0 && templateId.trim() && (
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground">No variables detected for this template. Mapping is not required.</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
