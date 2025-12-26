"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import { Loader2, RefreshCcw, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import { fetchCampaignConfig, fetchOrgSettings, updateUtilityConfig } from "@/lib/api";
import type { CampaignConfig, UtilityConfig } from "@/lib/types/campaign";
import type { OrgSettings } from "@/lib/types/org-settings";
import type { Order, OrdersListResponse } from "@/lib/types/order";
import type { FeedbackDefinitionSingleResponse } from "@/lib/types/feedback-definition";

type FeedbackDefinitionListItem = {
  _id: string;
  name: string;
  status?: string;
};

export default function FeedbackPage() {
  const { orgId } = useAuth();
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [feedbackDefinitions, setFeedbackDefinitions] = useState<FeedbackDefinitionListItem[]>([]);
  const [feedbackDefinitionsLoading, setFeedbackDefinitionsLoading] = useState(false);
  const [feedbackDefinitionsError, setFeedbackDefinitionsError] = useState<string | null>(null);

  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [orgSettingsLoading, setOrgSettingsLoading] = useState(false);
  const [orgSettingsError, setOrgSettingsError] = useState<string | null>(null);

  const [ordersTodayCount, setOrdersTodayCount] = useState<number | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingDefinitionId, setPendingDefinitionId] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<FeedbackDefinitionSingleResponse["data"] | null>(null);

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
        },
      });

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
    loadConfig();
    loadFeedbackDefinitions();
    loadOrgSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tz = config?.timezone || orgSettings?.timezone || "Asia/Kolkata";
    const posEnabled = !!orgSettings?.services?.posIntegration?.enabled;
    if (posEnabled) {
      loadOrdersTodayCount(tz);
    } else {
      setOrdersTodayCount(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.timezone, orgSettings?.services?.posIntegration?.enabled, orgSettings?.timezone]);

  const handleUtilityUpdate = async (updates: Partial<UtilityConfig>) => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const updated = await updateUtilityConfig(updates);
      setConfig({ ...config, utility: updated });
      setSavedMessage("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save feedback configuration");
    } finally {
      setSaving(false);
    }
  };

  const feedbackEnabled = !!config?.utility?.feedback?.enabled;
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
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as any)?.error || (json as any)?.message || "Failed to load template preview");
      }

      const parsed = json as FeedbackDefinitionSingleResponse;
      const def = (parsed?.data || (json as any)?.data || json) as FeedbackDefinitionSingleResponse["data"];
      setPreviewData(def);
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

  const selectedDefinitionName = useMemo(() => {
    const match = feedbackDefinitions.find((d) => d._id === feedbackDefinitionId);
    return match?.name || "";
  }, [feedbackDefinitions, feedbackDefinitionId]);

  const posEnabled = !!orgSettings?.services?.posIntegration?.enabled;
  const posActive = !!orgSettings?.posApiCredentials?.isActive;
  const posIntegrationLive = posEnabled && posActive;

  const refreshAll = async () => {
    await Promise.all([loadConfig(), loadFeedbackDefinitions(), loadOrgSettings()]);
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
                onCheckedChange={(checked) =>
                  handleUtilityUpdate({
                    feedback: { ...config!.utility.feedback, enabled: checked },
                  })
                }
                disabled={loadingConfig || saving || !config}
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
                    {orgSettingsLoading ? "Loading POS status..." : posEnabled ? "Connected" : "Not connected"}
                  </div>
                </div>
                {posEnabled ? (
                  <Badge variant="outline" className="gap-1">
                    {posIntegrationLive ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
                    {posIntegrationLive ? "Integration live" : "Needs attention"}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Offline</Badge>
                )}
              </div>

              {orgSettingsError ? (
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

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="text-xs text-muted-foreground">Preview</div>
                {previewData.template?.preview?.headerText ? (
                  <div className="text-sm font-medium">{previewData.template.preview.headerText}</div>
                ) : null}
                {previewData.template?.preview?.bodyText ? (
                  <div className="text-sm whitespace-pre-wrap">{previewData.template.preview.bodyText}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">No preview available.</div>
                )}
                {previewData.template?.preview?.footerText ? (
                  <div className="text-xs text-muted-foreground">{previewData.template.preview.footerText}</div>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm font-medium">Variable setup</div>
                <div className="text-sm text-muted-foreground">
                  Variable assignment UI will be added next. For now, you can save this template selection.
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!config || !pendingDefinitionId) return;
                await handleUtilityUpdate({
                  feedback: { ...config.utility.feedback, enabled: true, definitionId: pendingDefinitionId },
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


