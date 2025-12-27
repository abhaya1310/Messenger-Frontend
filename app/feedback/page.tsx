"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import { Loader2, RefreshCcw, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { fetchCampaignConfig, fetchOrgSettings, updateUtilityConfig } from "@/lib/api";
import type { CampaignConfig, UtilityConfig } from "@/lib/types/campaign";
import type { OrgSettings } from "@/lib/types/org-settings";
import type { Order, OrdersListResponse } from "@/lib/types/order";
import type { FeedbackDefinitionSingleResponse } from "@/lib/types/feedback-definition";
import type { TemplateVariableMappings } from "@/lib/types/template-variable-mapping";
import { MessagePreview } from "@/components/message-preview";

type FeedbackDefinitionListItem = {
  _id: string;
  name: string;
  status?: string;
};

export default function FeedbackPage() {
  const router = useRouter();
  const { orgId } = useAuth();
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [optimisticFeedbackEnabled, setOptimisticFeedbackEnabled] = useState<boolean | null>(null);

  const [feedbackDefinitions, setFeedbackDefinitions] = useState<FeedbackDefinitionListItem[]>([]);
  const [feedbackDefinitionsLoading, setFeedbackDefinitionsLoading] = useState(false);
  const [feedbackDefinitionsError, setFeedbackDefinitionsError] = useState<string | null>(null);

  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [orgSettingsLoading, setOrgSettingsLoading] = useState(false);
  const [orgSettingsError, setOrgSettingsError] = useState<string | null>(null);

  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);
  const [posIntegrationEnabled, setPosIntegrationEnabled] = useState<boolean | null>(null);

  const [ordersTodayCount, setOrdersTodayCount] = useState<number | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingDefinitionId, setPendingDefinitionId] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<FeedbackDefinitionSingleResponse["data"] | null>(null);

  const [previewUserInputs, setPreviewUserInputs] = useState<Record<string, string>>({});

  const publishedFeedbackDefinitions = useMemo(() => {
    return feedbackDefinitions
      .filter((d) => String(d.status || "").toLowerCase() === "published" || !d.status)
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [feedbackDefinitions]);

  const loadConfig = async () => {
    setError(null);
    setSavedMessage(null);
    setLoadingConfig(true);
    try {
      const next = await fetchCampaignConfig();
      setConfig(next);
    } catch (e) {
      setConfig(null);
      setError(e instanceof Error ? e.message : "Failed to load feedback configuration");
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadCapabilities = async () => {
    setCapabilitiesLoading(true);
    setCapabilitiesError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setPosIntegrationEnabled(null);
        return;
      }

      const res = await fetch("/api/campaign-runs/capabilities", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(orgId ? { "X-ORG-ID": orgId } : {}),
        },
      });

      if (res.status === 401) {
        clearAuth();
        router.push("/login");
        setPosIntegrationEnabled(null);
        setCapabilitiesError("Session expired. Please login again.");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPosIntegrationEnabled(null);
        setCapabilitiesError((data as any)?.error || (data as any)?.message || "Failed to load capabilities");
        return;
      }

      const enabled = Boolean(
        (data as any)?.data?.posIntegrationEnabled ??
        (data as any)?.posIntegrationEnabled ??
        (data as any)?.data?.pos_integration_enabled ??
        (data as any)?.data?.posEnabled
      );
      setPosIntegrationEnabled(enabled);
    } catch (e) {
      setPosIntegrationEnabled(null);
      setCapabilitiesError(e instanceof Error ? e.message : "Failed to load capabilities");
    } finally {
      setCapabilitiesLoading(false);
    }
  };

  const loadOrgSettings = async () => {
    if (!orgId) {
      setOrgSettings(null);
      return;
    }

    setOrgSettingsLoading(true);
    setOrgSettingsError(null);
    try {
      const next = await fetchOrgSettings(orgId);
      setOrgSettings(next);
    } catch (e) {
      setOrgSettings(null);
      setOrgSettingsError(e instanceof Error ? e.message : "Failed to load organization settings");
    } finally {
      setOrgSettingsLoading(false);
    }
  };

  const formatDateKey = (d: Date, tz: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  };

  const loadOrdersTodayCount = async (tz: string) => {
    const token = getAuthToken();
    if (!token) {
      setOrdersTodayCount(null);
      return;
    }

    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await fetch("/api/orders?limit=200", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res.json().catch(() => ({}))) as OrdersListResponse;
      if (!res.ok) {
        throw new Error((data as any)?.error || (data as any)?.message || "Failed to load orders");
      }

      const orders = ((data as any)?.data || (data as any)?.orders || []) as Order[];
      const list = Array.isArray(orders) ? orders : [];
      const today = formatDateKey(new Date(), tz);

      const count = list.filter((o) => {
        const createdAtRaw = (o as any)?.createdAt;
        if (!createdAtRaw) return false;
        const createdAt = new Date(createdAtRaw);
        if (Number.isNaN(createdAt.getTime())) return false;
        return formatDateKey(createdAt, tz) === today;
      }).length;

      setOrdersTodayCount(count);
    } catch (e) {
      setOrdersTodayCount(null);
      setOrdersError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadFeedbackDefinitions = async () => {
    setFeedbackDefinitionsError(null);
    setFeedbackDefinitionsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setFeedbackDefinitions([]);
        return;
      }

      const res = await fetch("/api/feedback-definitions?status=published", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(orgId ? { "X-ORG-ID": orgId } : {}),
        },
      });

      if (res.status === 401) {
        clearAuth();
        router.push("/login");
        setFeedbackDefinitions([]);
        setFeedbackDefinitionsError("Session expired. Please login again.");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any)?.error || (data as any)?.message || "Failed to load feedback definitions");
      }

      const items = ((data as any)?.data || []) as FeedbackDefinitionListItem[];
      setFeedbackDefinitions(Array.isArray(items) ? items : []);
    } catch (e) {
      setFeedbackDefinitions([]);
      setFeedbackDefinitionsError(e instanceof Error ? e.message : "Failed to load feedback definitions");
    } finally {
      setFeedbackDefinitionsLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
    void loadFeedbackDefinitions();
    void loadOrgSettings();
    void loadCapabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    const tz = config?.timezone || orgSettings?.timezone || "Asia/Kolkata";
    if (posIntegrationEnabled) {
      void loadOrdersTodayCount(tz);
    } else {
      setOrdersTodayCount(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.timezone, orgSettings?.timezone, posIntegrationEnabled]);

  const handleUtilityUpdate = async (updates: Partial<UtilityConfig>, opts?: { background?: boolean }) => {
    if (!config) return;
    const background = !!opts?.background;
    if (background) {
      setSavingToggle(true);
    } else {
      setSaving(true);
      setError(null);
      setSavedMessage(null);
    }
    try {
      const updated = await updateUtilityConfig(updates);
      setConfig({ ...config, utility: updated });
      if (!background) setSavedMessage("Saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        clearAuth();
        router.push("/login");
        if (!background) setError("Session expired. Please login again.");
        throw e;
      }
      if (!background) setError(e instanceof Error ? e.message : "Failed to save feedback configuration");
      throw e;
    } finally {
      if (background) {
        setSavingToggle(false);
      } else {
        setSaving(false);
      }
    }
  };

  const feedbackEnabled = optimisticFeedbackEnabled ?? !!config?.utility?.feedback?.enabled;
  const feedbackDelayMinutes = config?.utility?.feedback?.delayMinutes ?? 60;
  const feedbackDefinitionId = config?.utility?.feedback?.definitionId ?? "";

  const loadFeedbackDefinitionPreview = async (id: string) => {
    setPreviewError(null);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Unauthorized");

      const res = await fetch(`/api/feedback-definitions/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(orgId ? { "X-ORG-ID": orgId } : {}),
        },
      });

      if (res.status === 401) {
        clearAuth();
        router.push("/login");
        throw new Error("Session expired. Please login again.");
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as any)?.error || (json as any)?.message || "Failed to load template preview");
      }

      const parsed = json as FeedbackDefinitionSingleResponse;
      const def = (parsed?.data || (json as any)?.data || json) as FeedbackDefinitionSingleResponse["data"];
      setPreviewData(def);

      const mappings = ((def as any)?.templateVariableMappings || {}) as TemplateVariableMappings;
      const existing = ((config as any)?.utility?.feedback?.userInputParameters || {}) as Record<string, string>;
      const next: Record<string, string> = {};
      for (const k of Object.keys(mappings || {})) {
        const m = (mappings as any)[k];
        if (m && m.source === "static") {
          next[k] = String(existing?.[k] ?? "");
        }
      }
      setPreviewUserInputs(next);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Failed to load template preview");
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const openPreviewForDefinition = async (id: string) => {
    setPendingDefinitionId(id);
    setPreviewOpen(true);
    await loadFeedbackDefinitionPreview(id);
  };

  const previewMappings = useMemo(() => {
    return (((previewData as any)?.templateVariableMappings || {}) as TemplateVariableMappings) || {};
  }, [previewData]);

  const previewUserInputKeys = useMemo(() => {
    const keys = Object.keys(previewMappings || {}).filter((k) => (previewMappings as any)?.[k]?.source === "static");
    return keys
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
      .map((n) => String(n));
  }, [previewMappings]);

  function substituteTemplateText(params: {
    text?: string;
    sampleValues?: Record<string, string>;
    mappings?: TemplateVariableMappings;
    userValues?: Record<string, string>;
  }): string {
    const raw = params.text || "";
    if (!raw) return "";

    return raw.replace(/\{\{(\d+)\}\}/g, (_match, idxRaw) => {
      const idx = String(idxRaw);
      const uv = params.userValues?.[idx];
      if (uv && String(uv).trim()) return String(uv);

      const dummy = params.sampleValues?.[idx];
      if (dummy && String(dummy).trim()) return String(dummy);

      const mapping = params.mappings?.[idx];
      if (!mapping) return `{{${idx}}}`;
      if ((mapping as any).source === "customer") return `[customer.${(mapping as any).path}]`;
      if ((mapping as any).source === "transaction") return `[transaction.${(mapping as any).path}]`;
      return "[user input]";
    });
  }

  const previewText = useMemo(() => {
    const p = previewData?.template?.preview;
    if (!p) return "";
    const header = substituteTemplateText({
      text: p.headerText,
      sampleValues: p.sampleValues,
      mappings: previewMappings,
      userValues: previewUserInputs,
    });
    const body = substituteTemplateText({
      text: p.bodyText,
      sampleValues: p.sampleValues,
      mappings: previewMappings,
      userValues: previewUserInputs,
    });
    const footer = substituteTemplateText({
      text: p.footerText,
      sampleValues: p.sampleValues,
      mappings: previewMappings,
      userValues: previewUserInputs,
    });

    return [header, body, footer].filter(Boolean).join("\n\n");
  }, [previewData, previewMappings, previewUserInputs]);

  const selectedDefinitionName = useMemo(() => {
    const match = feedbackDefinitions.find((d) => d._id === feedbackDefinitionId);
    return match?.name || "";
  }, [feedbackDefinitions, feedbackDefinitionId]);

  const posEnabled = !!posIntegrationEnabled;

  const refreshAll = async () => {
    await Promise.all([loadConfig(), loadFeedbackDefinitions(), loadOrgSettings(), loadCapabilities()]);
    const tz = config?.timezone || orgSettings?.timezone || "Asia/Kolkata";
    if (posEnabled) {
      await loadOrdersTodayCount(tz);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#c9e7ff] via-[#a7c1ff] to-[#8ac7ff] p-8 text-white shadow-sm">
        <div className="space-y-4 max-w-3xl">
          <Badge className="w-fit bg-white/20 text-white">Feedback</Badge>
          <h1 className="text-4xl font-semibold leading-tight">Automated feedback requests</h1>
          <p className="text-lg">Pick a feedback template and enable the service. We will send it automatically after each POS transaction.</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Setup</CardTitle>
                <CardDescription>Configure the feedback service for your organization.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={refreshAll} disabled={loadingConfig || saving} className="gap-2">
                {loadingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            ) : null}

            {savedMessage && !saving ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">
                {savedMessage}
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
              <div>
                <p className="text-sm text-gray-500">Service status</p>
                <p className="font-medium">Feedback Requests</p>
              </div>
              <Switch
                checked={feedbackEnabled}
                onCheckedChange={(checked) => {
                  if (!config) return;
                  const previous = !!config.utility.feedback.enabled;
                  setOptimisticFeedbackEnabled(checked);
                  void (async () => {
                    try {
                      await handleUtilityUpdate({
                        feedback: { ...config.utility.feedback, enabled: checked },
                      }, { background: true });
                    } catch {
                      setOptimisticFeedbackEnabled(previous);
                    } finally {
                      setOptimisticFeedbackEnabled(null);
                    }
                  })();
                }}
                disabled={loadingConfig || !config}
              />
            </div>

            {loadingConfig ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : feedbackEnabled ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Delay after transaction (minutes)</Label>
                  <Select
                    value={String(feedbackDelayMinutes)}
                    onValueChange={(v) =>
                      handleUtilityUpdate({
                        feedback: { ...config!.utility.feedback, delayMinutes: parseInt(v) },
                      })
                    }
                    disabled={saving || !config}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
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
                  <Label className="text-xs text-gray-500">Feedback template *</Label>
                  <Select
                    value={feedbackDefinitionId}
                    onValueChange={(v) => {
                      if (!v || !config) return;
                      openPreviewForDefinition(v);
                    }}
                    disabled={saving || feedbackDefinitionsLoading || !config}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue
                        placeholder={
                          feedbackDefinitionsLoading
                            ? "Loading definitions..."
                            : publishedFeedbackDefinitions.length === 0
                              ? "No feedback definitions"
                              : "Select a feedback template"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {publishedFeedbackDefinitions.map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {feedbackDefinitionsError ? (
                    <p className="text-xs text-red-600" role="alert">
                      {feedbackDefinitionsError}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                Enable feedback to start sending automated feedback requests.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your service</CardTitle>
            <CardDescription>What you have configured so far.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">Feedback Requests</div>
                  <div className="text-sm text-gray-600">
                    {feedbackEnabled && feedbackDefinitionId ? (
                      <span>
                        Template: <span className="font-medium">{selectedDefinitionName || feedbackDefinitionId}</span>
                      </span>
                    ) : (
                      <span>Not configured yet</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {feedbackEnabled && feedbackDefinitionId ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </div>
              {feedbackEnabled && feedbackDefinitionId ? (
                <div className="mt-3 text-sm text-gray-600">
                  Delay: <span className="font-medium">{feedbackDelayMinutes} minutes</span>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    <Database className="h-4 w-4" />
                    POS Integration
                  </div>
                  <div className="text-sm text-gray-600">
                    {capabilitiesLoading ? "Loading POS status..." : posEnabled ? "Enabled" : "Not enabled"}
                  </div>
                </div>
                {posEnabled ? (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    POS enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary">Offline</Badge>
                )}
              </div>

              {capabilitiesError || orgSettingsError ? (
                <div className="mt-2 text-xs text-amber-700" role="alert">
                  Unable to load POS status. Please refresh.
                </div>
              ) : null}

              {posEnabled ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700">
                    Orders today:{" "}
                    {ordersLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        Loading
                      </span>
                    ) : ordersTodayCount === null ? (
                      <span className="text-gray-500">—</span>
                    ) : (
                      <span className="font-semibold">{ordersTodayCount}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const tz = config?.timezone || orgSettings?.timezone || "Asia/Kolkata";
                      loadOrdersTodayCount(tz);
                    }}
                    disabled={ordersLoading || !posEnabled}
                    className="gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              ) : null}

              {ordersError ? (
                <div className="mt-2 text-xs text-amber-700" role="alert">
                  Unable to load orders.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Template</DialogTitle>
            <DialogDescription>Review the template before saving it to your feedback service.</DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading preview…
            </div>
          ) : previewError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              Unable to load template preview.
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm font-medium">{previewData.name}</div>
                <div className="text-xs text-muted-foreground">
                  {previewData.template?.name} ({previewData.template?.language})
                </div>
              </div>

              {previewText ? (
                <MessagePreview templateName={previewData.template?.name || previewData.name} language={previewData.template?.language || ""} preview={previewText} />
              ) : (
                <div className="rounded-xl border border-gray-200 p-4 text-sm text-muted-foreground">No preview available.</div>
              )}

              {Object.keys(previewMappings || {}).length > 0 ? (
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="text-sm font-medium">Variables</div>
                  <div className="space-y-3">
                    {Object.keys(previewMappings)
                      .map((k) => Number(k))
                      .filter((n) => Number.isFinite(n))
                      .sort((a, b) => a - b)
                      .map((n) => {
                        const key = String(n);
                        const mapping = (previewMappings as any)?.[key];
                        const isUserInput = mapping?.source === "static";
                        const label = isUserInput ? (String(mapping?.label || "").trim() || `{{${key}}}`) : `{{${key}}}`;
                        const displayValue = isUserInput
                          ? String(previewUserInputs?.[key] ?? "")
                          : mapping?.source === "customer" || mapping?.source === "transaction"
                            ? String(mapping?.path || "")
                            : "";

                        return (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border p-3">
                            <div className="text-xs font-medium text-gray-700">{`{{${key}}}`}</div>
                            <div className="text-xs text-muted-foreground capitalize">{String(mapping?.source || "").replace("_", " ")}</div>
                            <div className="space-y-1">
                              {isUserInput ? (
                                <>
                                  <Label className="text-xs">{label} *</Label>
                                  <Input
                                    value={displayValue}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                      const v = e.target.value;
                                      setPreviewUserInputs((prev) => ({ ...prev, [key]: v }));
                                    }}
                                    placeholder="Enter value"
                                  />
                                </>
                              ) : (
                                <div className="text-xs text-gray-700 break-all">{displayValue || "—"}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!config || !pendingDefinitionId) return;

                for (const k of previewUserInputKeys) {
                  const v = String(previewUserInputs?.[k] ?? "").trim();
                  if (!v) {
                    setPreviewError("Please fill all required values.");
                    return;
                  }
                }

                await handleUtilityUpdate({
                  feedback: {
                    ...config.utility.feedback,
                    enabled: true,
                    definitionId: pendingDefinitionId,
                    ...(previewUserInputKeys.length > 0 ? { userInputParameters: previewUserInputs } : {}),
                  },
                });
                setPreviewOpen(false);
              }}
              disabled={saving || !pendingDefinitionId}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


