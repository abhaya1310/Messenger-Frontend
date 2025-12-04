"use client";

import { useState, useEffect } from "react";
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
import { Breadcrumb } from "@/components/breadcrumb";
import {
  BellRing,
  Sparkles,
  Gift,
  Users,
  HeartHandshake,
  Star,
  Plus,
  Play,
  Pause,
  Trash2,
  Loader2,
  Clock,
  Calendar,
  RefreshCcw,
} from "lucide-react";
import {
  fetchAutoCampaigns,
  createAutoCampaign,
  activateAutoCampaign,
  pauseAutoCampaign,
  deleteAutoCampaign,
  fetchTemplates,
  type Template,
} from "@/lib/api";
import type { AutoCampaign, CreateAutoCampaignRequest } from "@/lib/types/campaign";
import { handleApiError } from "@/lib/error-handler";

const triggerTypeInfo = {
  birthday: {
    title: "Birthday Campaign",
    description: "Send wishes and offers to customers on their birthday",
    icon: Gift,
    tone: "bg-[#edf3ff]",
  },
  anniversary: {
    title: "Anniversary Campaign",
    description: "Celebrate customer anniversaries with special messages",
    icon: Star,
    tone: "bg-[#f2f7ff]",
  },
  winback: {
    title: "Win-back Campaign",
    description: "Re-engage customers who haven't visited in a while",
    icon: HeartHandshake,
    tone: "bg-[#fdeef8]",
  },
  first_visit_followup: {
    title: "First Visit Follow-up",
    description: "Welcome new customers after their first visit",
    icon: Users,
    tone: "bg-[#ecfdf5]",
  },
};

export default function AutoCampaignsPage() {
  const [autoCampaigns, setAutoCampaigns] = useState<AutoCampaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTriggerType, setSelectedTriggerType] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAutoCampaignRequest>({
    name: "",
    triggerType: "birthday",
    triggerConfig: {
      runTime: "10:00",
      cooldownDays: 365,
    },
    template: { name: "", language: "en" },
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [campaignsData, templatesData] = await Promise.all([
        fetchAutoCampaigns(),
        fetchTemplates(),
      ]);
      setAutoCampaigns(campaignsData.autoCampaigns);
      setTemplates(templatesData.data.filter(t => t.status === "APPROVED"));
    } catch (error) {
      console.error("Failed to load auto campaigns:", error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog(triggerType: string) {
    setSelectedTriggerType(triggerType);
    setFormData({
      name: `${triggerTypeInfo[triggerType as keyof typeof triggerTypeInfo]?.title || triggerType}`,
      triggerType: triggerType as CreateAutoCampaignRequest["triggerType"],
      triggerConfig: {
        runTime: "10:00",
        cooldownDays: triggerType === "birthday" || triggerType === "anniversary" ? 365 : 30,
        ...(triggerType === "birthday" || triggerType === "anniversary"
          ? { dateOffset: { days: 0, reference: "on" as const } }
          : {}),
        ...(triggerType === "winback"
          ? { inactivity: { thresholdDays: 60 } }
          : {}),
      },
      template: { name: "", language: "en" },
    });
    setShowCreateDialog(true);
  }

  async function handleCreate() {
    if (!formData.name || !formData.template.name) {
      alert("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      await createAutoCampaign(formData);
      setShowCreateDialog(false);
      loadData();
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleActivate(id: string) {
    setActionLoading(id);
    try {
      await activateAutoCampaign(id);
      loadData();
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePause(id: string) {
    setActionLoading(id);
    try {
      await pauseAutoCampaign(id);
      loadData();
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this auto-campaign?")) return;

    setActionLoading(id);
    try {
      await deleteAutoCampaign(id);
      loadData();
    } catch (error) {
      alert(handleApiError(error));
    } finally {
      setActionLoading(null);
    }
  }

  function getTriggerDescription(campaign: AutoCampaign) {
    switch (campaign.triggerType) {
      case "birthday":
      case "anniversary": {
        const offset = campaign.triggerConfig.dateOffset;
        if (offset?.reference === "before") {
          return `${offset.days} days before`;
        } else if (offset?.reference === "after") {
          return `${offset.days} days after`;
        }
        return `On ${campaign.triggerType}`;
      }
      case "winback":
        return `After ${campaign.triggerConfig.inactivity?.thresholdDays || 60} days of inactivity`;
      case "first_visit_followup":
        return `${campaign.triggerConfig.postVisit?.daysAfter || 1} day(s) after first visit`;
      default:
        return campaign.triggerType;
    }
  }

  // Group campaigns by trigger type
  const campaignsByType = autoCampaigns.reduce((acc, campaign) => {
    const type = campaign.triggerType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(campaign);
    return acc;
  }, {} as Record<string, AutoCampaign[]>);

  // Available templates (not yet configured)
  const configuredTypes = new Set(autoCampaigns.map(c => c.triggerType));
  const availableTemplates = Object.entries(triggerTypeInfo).filter(
    ([type]) => !configuredTypes.has(type)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#b4f5ff] via-[#e7d9ff] to-[#ffd7f2] p-8 text-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <Badge className="w-fit bg-white/80 text-[var(--connectnow-accent-strong)]">
                Auto Campaigns • ConnectNow
              </Badge>
              <h1 className="text-4xl font-semibold leading-tight">
                Automate your customer engagement 🔔
              </h1>
              <p className="text-lg text-gray-700">
                Set up automated campaigns that trigger based on customer events like birthdays,
                anniversaries, or inactivity. Reach the right customers at the right time.
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
              <h3 className="text-sm font-semibold text-gray-600">
                Active Auto-Campaigns
              </h3>
              <p className="text-4xl font-bold text-[var(--connectnow-accent-strong)]">
                {autoCampaigns.filter(c => c.status === "active").length}
              </p>
              <p className="text-sm text-gray-600">
                of {autoCampaigns.length} total campaigns
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: "Auto Campaigns" }]} />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Active Auto-Campaigns */}
            {autoCampaigns.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Your Auto-Campaigns</h2>
                  <Button variant="outline" size="sm" onClick={loadData}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {autoCampaigns.map((campaign) => {
                    const typeInfo = triggerTypeInfo[campaign.triggerType as keyof typeof triggerTypeInfo];
                    const Icon = typeInfo?.icon || Gift;

                    return (
                      <Card key={campaign._id} className={`${typeInfo?.tone || "bg-gray-50"} border-none`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5 text-[var(--connectnow-accent-strong)]" />
                              <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            </div>
                            <Badge
                              variant={campaign.status === "active" ? "default" : "secondary"}
                              className={campaign.status === "active" ? "bg-green-100 text-green-700" : ""}
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                          <CardDescription>{getTriggerDescription(campaign)}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Runs at {campaign.triggerConfig.runTime || "10:00"} daily
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span>Template: <strong>{campaign.template.name}</strong></span>
                          </div>
                          {campaign.metrics.lastRunAt && (
                            <div className="pt-2 border-t border-white/50 text-sm text-gray-600">
                              Last run: {new Date(campaign.metrics.lastRunAt).toLocaleDateString()} 
                              ({campaign.metrics.lastRunCount} sent)
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2 pt-2">
                            <div className="text-center bg-white/60 rounded p-2">
                              <p className="text-lg font-bold">{campaign.metrics.totalSent}</p>
                              <p className="text-xs text-gray-500">Sent</p>
                            </div>
                            <div className="text-center bg-white/60 rounded p-2">
                              <p className="text-lg font-bold">{campaign.metrics.totalDelivered}</p>
                              <p className="text-xs text-gray-500">Delivered</p>
                            </div>
                            <div className="text-center bg-white/60 rounded p-2">
                              <p className="text-lg font-bold">{campaign.metrics.totalRead}</p>
                              <p className="text-xs text-gray-500">Read</p>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                          {campaign.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePause(campaign._id)}
                              disabled={actionLoading === campaign._id}
                            >
                              {actionLoading === campaign._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Pause className="h-4 w-4 mr-1" />
                                  Pause
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleActivate(campaign._id)}
                              disabled={actionLoading === campaign._id}
                            >
                              {actionLoading === campaign._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(campaign._id)}
                            disabled={actionLoading === campaign._id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Available Campaign Types */}
            <section>
              <h2 className="text-xl font-semibold mb-4">
                {autoCampaigns.length > 0 ? "Add More Auto-Campaigns" : "Get Started"}
              </h2>
              <p className="text-gray-600 mb-4">
                Choose a campaign type to set up automated messaging for your customers.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                {Object.entries(triggerTypeInfo).map(([type, info]) => {
                  const existing = campaignsByType[type];
                  const Icon = info.icon;

                  return (
                    <Card
                      key={type}
                      className={`${info.tone} border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                      onClick={() => openCreateDialog(type)}
                    >
                      <CardHeader className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-[var(--connectnow-accent-strong)]" />
                            <Badge variant="secondary" className="bg-white/80">
                              {existing?.length ? `${existing.length} configured` : "Not configured"}
                            </Badge>
                          </div>
                          <Plus className="h-5 w-5 text-gray-400" />
                        </div>
                        <CardTitle>{info.title}</CardTitle>
                        <CardDescription className="text-base text-gray-700">
                          {info.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="bg-white">
                          {existing?.length ? "Add Another" : "Set Up"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Create Auto-Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Create {triggerTypeInfo[selectedTriggerType as keyof typeof triggerTypeInfo]?.title || "Auto-Campaign"}
            </DialogTitle>
            <DialogDescription>
              {triggerTypeInfo[selectedTriggerType as keyof typeof triggerTypeInfo]?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Birthday Wishes"
              />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp Template *</Label>
              <Select
                value={formData.template.name}
                onValueChange={(name) =>
                  setFormData({ ...formData, template: { ...formData.template, name } })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Run Time (Daily)</Label>
              <Input
                type="time"
                value={formData.triggerConfig.runTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, runTime: e.target.value },
                  })
                }
              />
            </div>

            {(selectedTriggerType === "birthday" || selectedTriggerType === "anniversary") && (
              <div className="space-y-2">
                <Label>When to Send</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    className="w-20"
                    value={formData.triggerConfig.dateOffset?.days || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        triggerConfig: {
                          ...formData.triggerConfig,
                          dateOffset: {
                            days: parseInt(e.target.value) || 0,
                            reference: formData.triggerConfig.dateOffset?.reference || "on",
                          },
                        },
                      })
                    }
                  />
                  <Select
                    value={formData.triggerConfig.dateOffset?.reference || "on"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        triggerConfig: {
                          ...formData.triggerConfig,
                          dateOffset: {
                            days: formData.triggerConfig.dateOffset?.days || 0,
                            reference: value as "before" | "on" | "after",
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">days before</SelectItem>
                      <SelectItem value="on">on the day</SelectItem>
                      <SelectItem value="after">days after</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedTriggerType === "winback" && (
              <div className="space-y-2">
                <Label>Inactivity Threshold (days)</Label>
                <Input
                  type="number"
                  min={7}
                  max={365}
                  value={formData.triggerConfig.inactivity?.thresholdDays || 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      triggerConfig: {
                        ...formData.triggerConfig,
                        inactivity: { thresholdDays: parseInt(e.target.value) || 60 },
                      },
                    })
                  }
                />
                <p className="text-sm text-gray-500">
                  Send to customers who haven't visited for this many days
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Cooldown Period (days)</Label>
              <Input
                type="number"
                min={1}
                value={formData.triggerConfig.cooldownDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: {
                      ...formData.triggerConfig,
                      cooldownDays: parseInt(e.target.value) || 30,
                    },
                  })
                }
              />
              <p className="text-sm text-gray-500">
                Minimum days before sending to the same customer again
              </p>
            </div>

            <div className="space-y-2">
              <Label>Audience Filters (Optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">Min Visits</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Any"
                    value={formData.audienceFilters?.minVisits || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        audienceFilters: {
                          ...formData.audienceFilters,
                          minVisits: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Min Total Spend (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Any"
                    value={formData.audienceFilters?.minTotalSpend || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        audienceFilters: {
                          ...formData.audienceFilters,
                          minTotalSpend: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create & Activate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
