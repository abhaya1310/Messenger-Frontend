"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MessageCircle,
  ThumbsDown,
  ThumbsUp,
  Info,
  Star,
  AlertCircle,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import { fetchCampaignConfig, updateUtilityConfig } from "@/lib/api";
import type { CampaignConfig, UtilityConfig } from "@/lib/types/campaign";

const kpis = [
  { label: "Total Feedback", value: "1" },
  { label: "Avg. Rating", value: "2.00" },
  { label: "Channel", value: "Whatsapp Utility" },
];

const sentiment = [
  { label: "Positive Feedback", value: "0%", icon: ThumbsUp, tone: "text-green-600" },
  { label: "Negative Feedback", value: "100%", icon: ThumbsDown, tone: "text-red-500" },
  { label: "Neutral Feedback", value: "0%", icon: MessageCircle, tone: "text-yellow-500" },
];

const suggestionTiles = [
  {
    title: "Boost your online reputation",
    description:
      "Ask your happy customers to share a review on Google, Facebook etc.",
    action: "Create request",
  },
  {
    title: "Automate apologies on bad experiences",
    description:
      "Send a make-good coupon via WhatsApp whenever you get a low score.",
    action: "Design apology flow",
  },
];

type FeedbackDefinitionListItem = {
  _id: string;
  name: string;
  status?: string;
};

export default function FeedbackPage() {
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [feedbackDefinitions, setFeedbackDefinitions] = useState<FeedbackDefinitionListItem[]>([]);
  const [feedbackDefinitionsLoading, setFeedbackDefinitionsLoading] = useState(false);
  const [feedbackDefinitionsError, setFeedbackDefinitionsError] = useState<string | null>(null);

  const publishedFeedbackDefinitions = useMemo(() => {
    return feedbackDefinitions
      .filter((d) => String(d.status || "").toLowerCase() === "published" || !d.status)
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [feedbackDefinitions]);

  const loadConfig = async () => {
    setError(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUtilityUpdate = async (updates: Partial<UtilityConfig>) => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateUtilityConfig(updates);
      setConfig({ ...config, utility: updated });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save feedback configuration");
    } finally {
      setSaving(false);
    }
  };

  const feedbackEnabled = !!config?.utility?.feedback?.enabled;
  const feedbackDelayMinutes = config?.utility?.feedback?.delayMinutes ?? 60;
  const feedbackDefinitionId = config?.utility?.feedback?.definitionId ?? "";

  return (
    <div className="space-y-8 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#c9e7ff] via-[#a7c1ff] to-[#8ac7ff] p-8 text-white shadow-sm">
        <div className="space-y-4 max-w-3xl">
          <Badge className="w-fit bg-white/20 text-white">What&apos;s New</Badge>
          <h1 className="text-4xl font-semibold leading-tight">
            Turn Negative Feedback into Positive Relationships!
          </h1>
          <p className="text-lg">
            With the new feedback feature, you can easily send rewards or
            apologies to your customers in just a few clicks.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="bg-white text-[var(--connectnow-accent-strong)]">
              See how it works
            </Button>
            <Button variant="outline" className="bg-white/20 text-white border-white/40">
              Explore
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Feedback Insights</CardTitle>
              <CardDescription>
                Track your customer feedback with real-time analytics.
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              Last 12 months
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-dashed border-gray-200 p-4">
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-3xl font-semibold text-gray-900">
                  {kpi.value}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Feedback Settings</CardTitle>
                <CardDescription>Configure when and what to send after visits.</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  loadConfig();
                  loadFeedbackDefinitions();
                }}
                disabled={loadingConfig || saving}
                className="gap-2"
              >
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

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
              <div>
                <p className="text-sm text-gray-500">Channel</p>
                <p className="font-medium">WhatsApp Utility</p>
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
                    onValueChange={(v) =>
                      handleUtilityUpdate({
                        feedback: { ...config!.utility.feedback, definitionId: v },
                      })
                    }
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
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Feedback Report</CardTitle>
            <Info className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {sentiment.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-dashed border-gray-200 p-4 space-y-2"
              >
                <item.icon className={`h-6 w-6 ${item.tone}`} />
                <p className="text-3xl font-semibold">{item.value}</p>
                <p className="text-sm text-gray-500">{item.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Boost your online reputation</CardTitle>
            <CardDescription>
              Ask your happy customers to share reviews on Google, Facebook,
              etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600">
                Trigger auto-messages when ratings drop below 3 stars and attach
                a thank-you coupon when ratings are higher than 4.
              </p>
            </div>
            <Button variant="secondary" className="w-full">
              Build automation
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {suggestionTiles.map((tile) => (
          <Card key={tile.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                {tile.title}
              </CardTitle>
              <CardDescription>{tile.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">{tile.action}</Button>
            </CardContent>
          </Card>
        ))}
        <Card className="md:col-span-2 border-dashed">
          <CardHeader className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-[var(--connectnow-accent-strong)]" />
            <div>
              <CardTitle>Need more insights?</CardTitle>
              <CardDescription>
                Connect to your POS or CRM to unlock live restaurant feedback
                streams.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button>Connect Data Source</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


