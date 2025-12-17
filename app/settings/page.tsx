"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  Settings,
  Loader2,
  RefreshCcw,
  Smartphone,
  MessageSquare,
  Megaphone,
  Gift,
  Star,
  Database,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { fetchOrgSettings, updateServiceConfig } from "@/lib/api";
import type { OrgSettings, ServiceUpdate, OrgServices } from "@/lib/types/org-settings";
import { handleApiError } from "@/lib/error-handler";

interface ServiceConfig {
  key: keyof OrgServices;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  hasConfig?: boolean;
}

const services: ServiceConfig[] = [
  {
    key: "posIntegration",
    title: "POS Integration",
    description: "Sync customers and transactions from your POS system",
    icon: Database,
    hasConfig: true,
  },
  {
    key: "feedback",
    title: "Feedback Requests",
    description: "Request feedback after transactions (configure details in Campaign Settings)",
    icon: Star,
    hasConfig: false, // Detailed config moved to Auto-Campaigns page
  },
  {
    key: "billMessaging",
    title: "Bill Messaging",
    description: "Send digital bills via WhatsApp (configure details in Campaign Settings)",
    icon: MessageSquare,
    hasConfig: false, // Detailed config moved to Auto-Campaigns page
  },
  {
    key: "eventCampaigns",
    title: "Event Campaigns",
    description: "Schedule marketing campaigns for events and promotions",
    icon: Megaphone,
    hasConfig: true,
  },
  // Note: autoCampaigns removed - now fully managed in Campaign Settings page
  {
    key: "loyalty",
    title: "Loyalty Program",
    description: "Customer loyalty and rewards program",
    icon: Gift,
  },
];

export default function SettingsPage() {
  const { orgId, orgName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [orgId]);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrgSettings(orgId || undefined);
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError("Failed to load organization settings");
      // Set default settings for demo
      setSettings({
        orgId: orgId || "demo",
        orgName: orgName || "Demo Organization",
        services: {
          posIntegration: { enabled: false, syncFrequency: "daily" },
          feedback: { enabled: false, autoSendAfterTransaction: false, delayMinutes: 30 },
          billMessaging: { enabled: false, autoSend: false },
          eventCampaigns: { enabled: true, maxPerMonth: 10 },
          autoCampaigns: { enabled: true, allowedTriggers: ["birthday", "anniversary", "winback"] },
          loyalty: { enabled: false },
        },
        whatsapp: { phoneNumberId: "", defaultLanguage: "en" },
        timezone: "Asia/Kolkata",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleService(serviceKey: keyof OrgServices, enabled: boolean) {
    if (!settings || !orgId) return;

    setSaving(serviceKey);
    try {
      const update: ServiceUpdate = {
        service: serviceKey,
        enabled,
      };
      
      const updated = await updateServiceConfig(orgId, update);
      setSettings(updated);
    } catch (err) {
      alert(handleApiError(err));
      // Revert on error
      loadSettings();
    } finally {
      setSaving(null);
    }
  }

  async function handleUpdateServiceConfig(
    serviceKey: keyof OrgServices,
    config: Record<string, unknown>
  ) {
    if (!settings || !orgId) return;

    setSaving(serviceKey);
    try {
      const currentService = settings.services[serviceKey];
      const update: ServiceUpdate = {
        service: serviceKey,
        enabled: 'enabled' in currentService ? currentService.enabled : false,
        config,
      };
      
      const updated = await updateServiceConfig(orgId, update);
      setSettings(updated);
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--connectnow-accent-strong)]" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">
                Configure your organization settings and services
              </p>
            </div>
            <Button variant="outline" onClick={loadSettings}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: "Settings" }]} />

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800">{error}</p>
              <p className="text-sm text-amber-600">Showing default settings. Changes won't be saved.</p>
            </div>
          </div>
        )}

        {/* Organization Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={settings?.orgName || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input value={settings?.orgId || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={settings?.timezone || "Asia/Kolkata"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Default Language</Label>
                <Input value={settings?.whatsapp?.defaultLanguage || "en"} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              WhatsApp Configuration
            </CardTitle>
            <CardDescription>
              Your WhatsApp Business API configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={settings?.whatsapp?.phoneNumberId ? "••••••" + settings.whatsapp.phoneNumberId.slice(-4) : "Not configured"}
                    disabled
                    className="font-mono"
                  />
                  {settings?.whatsapp?.phoneNumberId && (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* POS API Credentials */}
        {settings?.posApiCredentials && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                POS API Credentials
              </CardTitle>
              <CardDescription>
                Your POS system integration credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={settings.posApiCredentials.apiKey}
                      disabled
                      className="font-mono"
                    />
                    <Badge variant={settings.posApiCredentials.isActive ? "default" : "secondary"}>
                      {settings.posApiCredentials.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Last Used</Label>
                  <Input
                    value={
                      settings.posApiCredentials.lastUsedAt
                        ? new Date(settings.posApiCredentials.lastUsedAt).toLocaleString()
                        : "Never"
                    }
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Settings Link */}
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Megaphone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Campaign Settings</CardTitle>
                  <CardDescription>
                    Configure automated campaigns (birthday, anniversary, festivals), utility messaging (bills, feedback, reviews), and more
                  </CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="gap-2 border-purple-300 hover:bg-purple-100"
                onClick={() => window.location.href = '/auto-campaigns'}
              >
                Configure
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Services */}
        <h2 className="text-xl font-semibold mb-4">Services</h2>
        <div className="space-y-4">
          {services.map((service) => {
            const serviceSettings = settings?.services[service.key];
            const enabled = serviceSettings && 'enabled' in serviceSettings ? serviceSettings.enabled : false;
            const Icon = service.icon;

            return (
              <Card key={service.key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5 text-[var(--connectnow-accent-strong)]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{service.title}</CardTitle>
                        <CardDescription>{service.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {saving === service.key && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      )}
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => handleToggleService(service.key, checked)}
                        disabled={saving === service.key}
                      />
                    </div>
                  </div>
                </CardHeader>

                {enabled && service.hasConfig && (
                  <CardContent className="border-t pt-4">
                    {/* POS Integration Config */}
                    {service.key === "posIntegration" && serviceSettings && 'syncFrequency' in serviceSettings && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Sync Frequency</Label>
                          <Select
                            value={serviceSettings.syncFrequency}
                            onValueChange={(value) =>
                              handleUpdateServiceConfig(service.key, { syncFrequency: value })
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="realtime">Real-time</SelectItem>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Event Campaigns Config */}
                    {service.key === "eventCampaigns" && serviceSettings && 'maxPerMonth' in serviceSettings && (
                      <div className="space-y-2">
                        <Label>Max campaigns per month</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={serviceSettings.maxPerMonth || 10}
                          onChange={(e) =>
                            handleUpdateServiceConfig(service.key, {
                              maxPerMonth: parseInt(e.target.value) || 10,
                            })
                          }
                          className="w-32"
                        />
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

