"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  BellRing,
  Sparkles,
  Gift,
  Users,
  HeartHandshake,
  Star,
  Plus,
  Trash2,
  Loader2,
  Clock,
  Calendar,
  RefreshCcw,
  MessageSquare,
  Send,
  CheckCircle,
  PartyPopper,
  Receipt,
  ThumbsUp,
  ExternalLink,
  Edit,
  Save,
  X,
} from "lucide-react";
import {
  fetchCampaignConfig,
  updateBirthdayConfig,
  updateAnniversaryConfig,
  updateFirstVisitConfig,
  updateWinbackConfig,
  addWinbackTier,
  removeWinbackTier,
  addFestival,
  updateFestival,
  deleteFestival,
  updateUtilityConfig,
  fetchAutoCampaignStats,
} from "@/lib/api";
import type {
  CampaignConfig,
  BirthdayConfig,
  AnniversaryConfig,
  FirstVisitConfig,
  WinbackConfig,
  WinbackTier,
  FestivalConfig,
  UtilityConfig,
  AutoCampaignStats,
  CampaignStats,
} from "@/lib/types/campaign";
import { handleApiError } from "@/lib/error-handler";
import { getAuthToken } from "@/lib/auth";

type FeedbackDefinitionListItem = {
  _id: string;
  name: string;
  status?: string;
};

// Helper to format days offset for display
function formatDaysOffset(days: number): string {
  if (days < 0) return `${Math.abs(days)} days before`;
  if (days > 0) return `${days} days after`;
  return "On the day";
}

// Stats Card Component
function StatsCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="text-center bg-white/60 rounded-lg p-3">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}

// Campaign Stats Display
function CampaignStatsDisplay({ stats }: { stats: CampaignStats }) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-200">
      <StatsCard label="Sent" value={stats.sent.toLocaleString()} />
      <StatsCard label="Delivered" value={stats.delivered.toLocaleString()} />
      <StatsCard label="Read" value={stats.read.toLocaleString()} />
      <StatsCard
        label="Read Rate"
        value={`${stats.readRate.toFixed(1)}%`}
      />
    </div>
  );
}

export default function AutoCampaignsPage() {
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [stats, setStats] = useState<AutoCampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [feedbackDefinitions, setFeedbackDefinitions] = useState<FeedbackDefinitionListItem[]>([]);
  const [feedbackDefinitionsLoading, setFeedbackDefinitionsLoading] = useState(false);
  const [feedbackDefinitionsError, setFeedbackDefinitionsError] = useState<string | null>(null);

  // Festival dialog state
  const [showFestivalDialog, setShowFestivalDialog] = useState(false);
  const [editingFestival, setEditingFestival] = useState<FestivalConfig | null>(null);
  const [festivalForm, setFestivalForm] = useState({
    name: "",
    date: "",
    daysOffset: 3,
    enabled: true,
    templateId: "",
  });

  // Add tier dialog state
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [newTierDays, setNewTierDays] = useState(45);

  useEffect(() => {
    loadData();
  }, []);

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
    loadFeedbackDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publishedFeedbackDefinitions = useMemo(() => {
    return feedbackDefinitions
      .filter((d) => String(d.status || "").toLowerCase() === "published" || !d.status)
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [feedbackDefinitions]);

  async function loadData() {
    setLoading(true);
    try {
      const [configData, statsData] = await Promise.allSettled([
        fetchCampaignConfig(),
        fetchAutoCampaignStats(),
      ]);

      if (configData.status === "fulfilled") {
        setConfig(configData.value);
      } else {
        console.error("Failed to load config:", configData.reason);
        // Set default config for development/demo
        setConfig(getDefaultConfig());
      }

      if (statsData.status === "fulfilled") {
        setStats(statsData.value);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  function getDefaultConfig(): CampaignConfig {
    return {
      orgId: "",
      birthday: { enabled: false, daysOffset: 0, sendTime: "10:00", minVisits: 1, templateId: "" },
      anniversary: { enabled: false, daysOffset: 0, sendTime: "10:00", minVisits: 1, templateId: "" },
      firstVisit: { enabled: false, daysAfter: 1, sendTime: "10:00", templateId: "" },
      winback: { enabled: false, tiers: [], cooldownDays: 30, minVisits: 2 },
      festivals: [],
      utility: {
        billMessaging: { enabled: false, autoSend: false, templateId: "" },
        feedback: { enabled: false, delayMinutes: 60, definitionId: "" },
        reviewRequest: { enabled: false, daysAfterVisit: 1, reviewLink: "", templateId: "" },
      },
      defaultSendTime: "10:00",
      timezone: "Asia/Kolkata",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Birthday Config Handlers
  async function handleBirthdayToggle(enabled: boolean) {
    if (!config) return;
    setSaving("birthday");
    try {
      const updated = await updateBirthdayConfig({ enabled });
      setConfig({ ...config, birthday: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleBirthdayUpdate(updates: Partial<BirthdayConfig>) {
    if (!config) return;
    setSaving("birthday");
    try {
      const updated = await updateBirthdayConfig(updates);
      setConfig({ ...config, birthday: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  // Anniversary Config Handlers
  async function handleAnniversaryToggle(enabled: boolean) {
    if (!config) return;
    setSaving("anniversary");
    try {
      const updated = await updateAnniversaryConfig({ enabled });
      setConfig({ ...config, anniversary: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleAnniversaryUpdate(updates: Partial<AnniversaryConfig>) {
    if (!config) return;
    setSaving("anniversary");
    try {
      const updated = await updateAnniversaryConfig(updates);
      setConfig({ ...config, anniversary: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  // First Visit Config Handlers
  async function handleFirstVisitToggle(enabled: boolean) {
    if (!config) return;
    setSaving("firstVisit");
    try {
      const updated = await updateFirstVisitConfig({ enabled });
      setConfig({ ...config, firstVisit: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleFirstVisitUpdate(updates: Partial<FirstVisitConfig>) {
    if (!config) return;
    setSaving("firstVisit");
    try {
      const updated = await updateFirstVisitConfig(updates);
      setConfig({ ...config, firstVisit: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  // Winback Config Handlers
  async function handleWinbackToggle(enabled: boolean) {
    if (!config) return;
    setSaving("winback");
    try {
      const updated = await updateWinbackConfig({ enabled });
      setConfig({ ...config, winback: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleWinbackUpdate(updates: Partial<WinbackConfig>) {
    if (!config) return;
    setSaving("winback");
    try {
      const updated = await updateWinbackConfig(updates);
      setConfig({ ...config, winback: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleAddTier() {
    if (!config) return;
    setSaving("winback-tier");
    try {
      const updated = await addWinbackTier({ days: newTierDays, templateId: "", enabled: true });
      setConfig({ ...config, winback: updated });
      setShowTierDialog(false);
      setNewTierDays(45);
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleRemoveTier(days: number) {
    if (!config) return;
    if (!confirm(`Remove the ${days}-day tier?`)) return;
    setSaving("winback-tier");
    try {
      const updated = await removeWinbackTier(days);
      setConfig({ ...config, winback: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleTierToggle(days: number, enabled: boolean) {
    if (!config) return;
    setSaving("winback-tier");
    try {
      const updatedTiers = config.winback.tiers.map(t =>
        t.days === days ? { ...t, enabled } : t
      );
      const updated = await updateWinbackConfig({ tiers: updatedTiers });
      setConfig({ ...config, winback: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  // Festival Handlers
  function openFestivalDialog(festival?: FestivalConfig) {
    if (festival) {
      setEditingFestival(festival);
      setFestivalForm({
        name: festival.name,
        date: festival.date,
        daysOffset: festival.daysOffset,
        enabled: festival.enabled,
        templateId: festival.templateId,
      });
    } else {
      setEditingFestival(null);
      setFestivalForm({
        name: "",
        date: "",
        daysOffset: 3,
        enabled: true,
        templateId: "",
      });
    }
    setShowFestivalDialog(true);
  }

  async function handleSaveFestival() {
    if (!config || !festivalForm.name || !festivalForm.date) {
      alert("Please fill in festival name and date");
      return;
    }
    setSaving("festival");
    try {
      let updatedFestivals: FestivalConfig[];
      if (editingFestival) {
        updatedFestivals = await updateFestival(editingFestival.id, festivalForm);
      } else {
        updatedFestivals = await addFestival(festivalForm);
      }
      setConfig({ ...config, festivals: updatedFestivals });
      setShowFestivalDialog(false);
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleDeleteFestival(id: string) {
    if (!config) return;
    if (!confirm("Delete this festival?")) return;
    setSaving("festival");
    try {
      const updatedFestivals = await deleteFestival(id);
      setConfig({ ...config, festivals: updatedFestivals });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  async function handleFestivalToggle(id: string, enabled: boolean) {
    if (!config) return;
    setSaving("festival");
    try {
      const updatedFestivals = await updateFestival(id, { enabled });
      setConfig({ ...config, festivals: updatedFestivals });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  // Utility Config Handlers
  async function handleUtilityUpdate(updates: Partial<UtilityConfig>) {
    if (!config) return;
    setSaving("utility");
    try {
      const updated = await updateUtilityConfig(updates);
      setConfig({ ...config, utility: updated });
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setSaving(null);
    }
  }

  // Count active campaigns
  const activeCampaignsCount = config
    ? [
      config.birthday.enabled,
      config.anniversary.enabled,
      config.firstVisit.enabled,
      config.winback.enabled,
      ...config.festivals.map(f => f.enabled),
      config.utility.billMessaging.enabled,
      config.utility.feedback.enabled,
      config.utility.reviewRequest.enabled,
    ].filter(Boolean).length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--connectnow-accent-strong)]" />
          <p className="text-gray-600">Loading campaign settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#b4f5ff] via-[#e7d9ff] to-[#ffd7f2] p-8 text-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <Badge className="w-fit bg-white/80 text-[var(--connectnow-accent-strong)]">
                Campaign Settings • ConnectNow
              </Badge>
              <h1 className="text-4xl font-semibold leading-tight">
                Automate your customer engagement 🔔
              </h1>
              <p className="text-lg text-gray-700">
                Configure automated campaigns that trigger based on customer events like birthdays,
                anniversaries, festivals, or inactivity. Reach the right customers at the right time.
              </p>
              <div className="flex flex-wrap gap-3 text-sm font-medium text-gray-700">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2">
                  <BellRing className="h-4 w-4" />
                  Automatic triggers
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2">
                  <Sparkles className="h-4 w-4" />
                  Personalized messages
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 p-6 shadow-inner space-y-4">
              <h3 className="text-sm font-semibold text-gray-600">Active Campaigns</h3>
              <p className="text-4xl font-bold text-[var(--connectnow-accent-strong)]">
                {activeCampaignsCount}
              </p>
              <p className="text-sm text-gray-600">
                campaigns running automatically
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: "Campaign Settings" }]} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">
              Timezone: {config?.timezone || "Asia/Kolkata"} • Default send time: {config?.defaultSendTime || "10:00"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="automated" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="automated" className="gap-2">
              <BellRing className="h-4 w-4" />
              Automated
            </TabsTrigger>
            <TabsTrigger value="festivals" className="gap-2">
              <PartyPopper className="h-4 w-4" />
              Festivals
            </TabsTrigger>
            <TabsTrigger value="utility" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Utility
            </TabsTrigger>
          </TabsList>

          {/* Automated Campaigns Tab */}
          <TabsContent value="automated" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Birthday Campaign */}
              <Card className="bg-[#edf3ff] border-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Gift className="h-5 w-5 text-pink-500" />
                      </div>
                      <div>
                        <CardTitle>Birthday Campaign</CardTitle>
                        <CardDescription>Send wishes on customer birthdays</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {saving === "birthday" && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch
                        checked={config?.birthday.enabled || false}
                        onCheckedChange={handleBirthdayToggle}
                        disabled={saving === "birthday"}
                      />
                    </div>
                  </div>
                </CardHeader>
                {config?.birthday.enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">When to Send</Label>
                        <Select
                          value={config.birthday.daysOffset.toString()}
                          onValueChange={(v) => handleBirthdayUpdate({ daysOffset: parseInt(v) })}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-7">7 days before</SelectItem>
                            <SelectItem value="-3">3 days before</SelectItem>
                            <SelectItem value="-1">1 day before</SelectItem>
                            <SelectItem value="0">On birthday</SelectItem>
                            <SelectItem value="1">1 day after</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Send Time</Label>
                        <Input
                          type="time"
                          value={config.birthday.sendTime}
                          onChange={(e) => handleBirthdayUpdate({ sendTime: e.target.value })}
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Minimum Visits Required</Label>
                      <Input
                        type="number"
                        min={0}
                        value={config.birthday.minVisits}
                        onChange={(e) => handleBirthdayUpdate({ minVisits: parseInt(e.target.value) || 0 })}
                        className="bg-white w-24"
                      />
                    </div>
                    {config.birthday.templateId && (
                      <p className="text-xs text-gray-500">
                        Template: <span className="font-medium">{config.birthday.templateId}</span>
                      </p>
                    )}
                    {stats?.birthday && <CampaignStatsDisplay stats={stats.birthday} />}
                  </CardContent>
                )}
              </Card>

              {/* Anniversary Campaign */}
              <Card className="bg-[#f2f7ff] border-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Star className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <CardTitle>Anniversary Campaign</CardTitle>
                        <CardDescription>Celebrate customer anniversaries</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {saving === "anniversary" && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch
                        checked={config?.anniversary.enabled || false}
                        onCheckedChange={handleAnniversaryToggle}
                        disabled={saving === "anniversary"}
                      />
                    </div>
                  </div>
                </CardHeader>
                {config?.anniversary.enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">When to Send</Label>
                        <Select
                          value={config.anniversary.daysOffset.toString()}
                          onValueChange={(v) => handleAnniversaryUpdate({ daysOffset: parseInt(v) })}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-7">7 days before</SelectItem>
                            <SelectItem value="-3">3 days before</SelectItem>
                            <SelectItem value="-1">1 day before</SelectItem>
                            <SelectItem value="0">On anniversary</SelectItem>
                            <SelectItem value="1">1 day after</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Send Time</Label>
                        <Input
                          type="time"
                          value={config.anniversary.sendTime}
                          onChange={(e) => handleAnniversaryUpdate({ sendTime: e.target.value })}
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Minimum Visits Required</Label>
                      <Input
                        type="number"
                        min={0}
                        value={config.anniversary.minVisits}
                        onChange={(e) => handleAnniversaryUpdate({ minVisits: parseInt(e.target.value) || 0 })}
                        className="bg-white w-24"
                      />
                    </div>
                    {stats?.anniversary && <CampaignStatsDisplay stats={stats.anniversary} />}
                  </CardContent>
                )}
              </Card>

              {/* First Visit Follow-up */}
              <Card className="bg-[#ecfdf5] border-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Users className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <CardTitle>First Visit Follow-up</CardTitle>
                        <CardDescription>Welcome new customers after their first visit</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {saving === "firstVisit" && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch
                        checked={config?.firstVisit.enabled || false}
                        onCheckedChange={handleFirstVisitToggle}
                        disabled={saving === "firstVisit"}
                      />
                    </div>
                  </div>
                </CardHeader>
                {config?.firstVisit.enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Days After First Visit</Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={config.firstVisit.daysAfter}
                          onChange={(e) => handleFirstVisitUpdate({ daysAfter: parseInt(e.target.value) || 1 })}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Send Time</Label>
                        <Input
                          type="time"
                          value={config.firstVisit.sendTime}
                          onChange={(e) => handleFirstVisitUpdate({ sendTime: e.target.value })}
                          className="bg-white"
                        />
                      </div>
                    </div>
                    {stats?.firstVisit && <CampaignStatsDisplay stats={stats.firstVisit} />}
                  </CardContent>
                )}
              </Card>

              {/* Win-back Campaign */}
              <Card className="bg-[#fdeef8] border-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <HeartHandshake className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle>Win-back Campaign</CardTitle>
                        <CardDescription>Re-engage inactive customers</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {saving === "winback" && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch
                        checked={config?.winback.enabled || false}
                        onCheckedChange={handleWinbackToggle}
                        disabled={saving === "winback"}
                      />
                    </div>
                  </div>
                </CardHeader>
                {config?.winback.enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Cooldown (days between messages)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={config.winback.cooldownDays}
                          onChange={(e) => handleWinbackUpdate({ cooldownDays: parseInt(e.target.value) || 30 })}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Min Visits Required</Label>
                        <Input
                          type="number"
                          min={1}
                          value={config.winback.minVisits}
                          onChange={(e) => handleWinbackUpdate({ minVisits: parseInt(e.target.value) || 2 })}
                          className="bg-white"
                        />
                      </div>
                    </div>

                    {/* Tier Management */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-500">Inactivity Tiers</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTierDialog(true)}
                          className="h-7 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Tier
                        </Button>
                      </div>
                      {config.winback.tiers.length > 0 ? (
                        <div className="bg-white rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Days</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {config.winback.tiers.sort((a, b) => a.days - b.days).map((tier) => (
                                <TableRow key={tier.days}>
                                  <TableCell className="text-sm font-medium">{tier.days} days</TableCell>
                                  <TableCell>
                                    <Switch
                                      checked={tier.enabled}
                                      onCheckedChange={(checked) => handleTierToggle(tier.days, checked)}
                                      disabled={saving === "winback-tier"}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveTier(tier.days)}
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4 bg-white/50 rounded-lg">
                          No tiers configured. Add a tier to get started.
                        </p>
                      )}
                    </div>
                    {stats?.winback && <CampaignStatsDisplay stats={stats.winback} />}
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Festivals Tab */}
          <TabsContent value="festivals" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Festival Campaigns</CardTitle>
                    <CardDescription>
                      Send greetings and offers during festivals and special occasions
                    </CardDescription>
                  </div>
                  <Button onClick={() => openFestivalDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Festival
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {config?.festivals && config.festivals.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {config.festivals.map((festival) => (
                      <Card key={festival.id} className={`${festival.enabled ? "bg-amber-50" : "bg-gray-50"} border-none`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PartyPopper className={`h-4 w-4 ${festival.enabled ? "text-amber-500" : "text-gray-400"}`} />
                              <CardTitle className="text-base">{festival.name}</CardTitle>
                            </div>
                            <Switch
                              checked={festival.enabled}
                              onCheckedChange={(checked) => handleFestivalToggle(festival.id, checked)}
                              disabled={saving === "festival"}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{festival.date} ({formatDaysOffset(-festival.daysOffset)} to send)</span>
                          </div>
                          {festival.templateId && (
                            <p className="text-xs text-gray-500">
                              Template: {festival.templateId}
                            </p>
                          )}
                        </CardContent>
                        <CardFooter className="gap-2 pt-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openFestivalDialog(festival)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFestival(festival.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <PartyPopper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No festivals configured</h3>
                    <p className="text-gray-500 mb-4">
                      Add festivals like Diwali, Christmas, or New Year to send automated greetings
                    </p>
                    <Button onClick={() => openFestivalDialog()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Your First Festival
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            {stats?.festival && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Festival Campaign Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <CampaignStatsDisplay stats={stats.festival} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Utility Messaging Tab */}
          <TabsContent value="utility" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Bill Messaging */}
              <Card className="bg-[#f0f9ff] border-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Receipt className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Bill Messaging</CardTitle>
                        <CardDescription>Send digital bills via WhatsApp</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={config?.utility.billMessaging.enabled || false}
                      onCheckedChange={(checked) =>
                        handleUtilityUpdate({
                          billMessaging: { ...config!.utility.billMessaging, enabled: checked },
                        })
                      }
                      disabled={saving === "utility"}
                    />
                  </div>
                </CardHeader>
                {config?.utility.billMessaging.enabled && (
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Auto-send after transaction</Label>
                        <p className="text-xs text-gray-500">Automatically send bills</p>
                      </div>
                      <Switch
                        checked={config.utility.billMessaging.autoSend}
                        onCheckedChange={(checked) =>
                          handleUtilityUpdate({
                            billMessaging: { ...config.utility.billMessaging, autoSend: checked },
                          })
                        }
                        disabled={saving === "utility"}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Feedback Request */}
              <Card className="bg-[#fefce8] border-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <ThumbsUp className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Feedback Request</CardTitle>
                        <CardDescription>Request feedback after visits</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={config?.utility.feedback.enabled || false}
                      onCheckedChange={(checked) =>
                        handleUtilityUpdate({
                          feedback: { ...config!.utility.feedback, enabled: checked },
                        })
                      }
                      disabled={saving === "utility"}
                    />
                  </div>
                </CardHeader>
                {config?.utility.feedback.enabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Delay after transaction (minutes)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={String(config.utility.feedback.delayMinutes ?? 60)}
                        onChange={(e) => {
                          const next = Number.parseInt(String(e.target.value || "").trim(), 10);
                          if (!Number.isFinite(next)) return;
                          handleUtilityUpdate({
                            feedback: { ...config.utility.feedback, delayMinutes: next },
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Feedback template *</Label>
                      <Select
                        value={config.utility.feedback.campaignDefinitionId || config.utility.feedback.definitionId || ""}
                        onValueChange={(v) =>
                          handleUtilityUpdate({
                            feedback: { ...config.utility.feedback, campaignDefinitionId: v },
                          })
                        }
                        disabled={saving === "utility" || feedbackDefinitionsLoading}
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
                    {stats?.feedback && <CampaignStatsDisplay stats={stats.feedback} />}
                  </CardContent>
                )}
              </Card>

              {/* Review Request */}
              <Card className="bg-[#f0fdf4] border-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <ExternalLink className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Review Request</CardTitle>
                        <CardDescription>Request Google/Zomato reviews</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={config?.utility.reviewRequest.enabled || false}
                      onCheckedChange={(checked) =>
                        handleUtilityUpdate({
                          reviewRequest: { ...config!.utility.reviewRequest, enabled: checked },
                        })
                      }
                      disabled={saving === "utility"}
                    />
                  </div>
                </CardHeader>
                {config?.utility.reviewRequest.enabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Days after visit to request</Label>
                      <Input
                        type="number"
                        min={1}
                        max={14}
                        value={config.utility.reviewRequest.daysAfterVisit}
                        onChange={(e) =>
                          handleUtilityUpdate({
                            reviewRequest: {
                              ...config.utility.reviewRequest,
                              daysAfterVisit: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Review Link (Google/Zomato)</Label>
                      <Input
                        type="url"
                        placeholder="https://g.page/r/..."
                        value={config.utility.reviewRequest.reviewLink}
                        onChange={(e) =>
                          handleUtilityUpdate({
                            reviewRequest: {
                              ...config.utility.reviewRequest,
                              reviewLink: e.target.value,
                            },
                          })
                        }
                        className="bg-white"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Tier Dialog */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Win-back Tier</DialogTitle>
            <DialogDescription>
              Add a new inactivity threshold for win-back messages
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Days of Inactivity</Label>
              <Input
                type="number"
                min={7}
                max={365}
                value={newTierDays}
                onChange={(e) => setNewTierDays(parseInt(e.target.value) || 45)}
              />
              <p className="text-xs text-gray-500">
                Send win-back message after {newTierDays} days of no visits
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTier} disabled={saving === "winback-tier"}>
              {saving === "winback-tier" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Festival Dialog */}
      <Dialog open={showFestivalDialog} onOpenChange={setShowFestivalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFestival ? "Edit Festival" : "Add Festival"}</DialogTitle>
            <DialogDescription>
              Configure a festival campaign to send automated greetings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Festival Name *</Label>
              <Input
                placeholder="e.g., Diwali, Christmas"
                value={festivalForm.name}
                onChange={(e) => setFestivalForm({ ...festivalForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date (MM-DD) *</Label>
              <Input
                placeholder="e.g., 11-01 for November 1st"
                value={festivalForm.date}
                onChange={(e) => setFestivalForm({ ...festivalForm, date: e.target.value })}
                pattern="[0-1][0-9]-[0-3][0-9]"
              />
              <p className="text-xs text-gray-500">Format: MM-DD (e.g., 12-25 for Christmas)</p>
            </div>
            <div className="space-y-2">
              <Label>Days Before to Send</Label>
              <Select
                value={festivalForm.daysOffset.toString()}
                onValueChange={(v) => setFestivalForm({ ...festivalForm, daysOffset: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">On the day</SelectItem>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="5">5 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable Campaign</Label>
              <Switch
                checked={festivalForm.enabled}
                onCheckedChange={(checked) => setFestivalForm({ ...festivalForm, enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFestivalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFestival} disabled={saving === "festival"}>
              {saving === "festival" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingFestival ? "Save Changes" : "Add Festival"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
