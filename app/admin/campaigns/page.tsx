"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Breadcrumb } from "@/components/breadcrumb";
import {
    Megaphone,
    Plus,
    Search,
    Loader2,
    Calendar,
    Send,
    CheckCircle,
    Clock,
    AlertCircle,
    Play,
    Pause,
    XCircle,
} from "lucide-react";
import type { Template } from "@/lib/api";
import type { Campaign, CreateCampaignRequest } from "@/lib/types/campaign";

function newId(prefix: string) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export default function AdminCampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);

    const [formData, setFormData] = useState<CreateCampaignRequest>({
        name: "",
        description: "",
        type: "event",
        scheduledAt: "",
        template: { name: "", language: "en" },
        audience: { type: "all" },
    });

    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const t = setTimeout(() => {
            setTemplates([]);
            setCampaigns([]);
            setLoading(false);
        }, 250);
        return () => clearTimeout(t);
    }, []);

    function resetForm() {
        setFormData({
            name: "",
            description: "",
            type: "event",
            scheduledAt: "",
            template: { name: "", language: "en" },
            audience: { type: "all" },
        });
    }

    function getStatusBadge(status: Campaign["status"]) {
        const variants: Record<Campaign["status"], { variant: "default" | "secondary" | "outline"; className: string }> = {
            draft: { variant: "secondary", className: "bg-gray-100 text-gray-700" },
            scheduled: { variant: "outline", className: "border-blue-500 text-blue-600" },
            active: { variant: "default", className: "bg-green-100 text-green-700" },
            paused: { variant: "outline", className: "border-yellow-500 text-yellow-600" },
            completed: { variant: "secondary", className: "bg-blue-100 text-blue-700" },
            cancelled: { variant: "secondary", className: "bg-red-100 text-red-700" },
        };
        return variants[status] || variants.draft;
    }

    function getStatusIcon(status: Campaign["status"]) {
        switch (status) {
            case "draft":
                return <Clock className="h-4 w-4" />;
            case "scheduled":
                return <Calendar className="h-4 w-4" />;
            case "active":
                return <Play className="h-4 w-4" />;
            case "paused":
                return <Pause className="h-4 w-4" />;
            case "completed":
                return <CheckCircle className="h-4 w-4" />;
            case "cancelled":
                return <XCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    }

    const filteredCampaigns = useMemo(() => {
        return campaigns
            .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
            .filter((c) => (typeFilter === "all" ? true : c.type === typeFilter));
    }, [campaigns, searchQuery, statusFilter, typeFilter]);

    async function handleCreateCampaign() {
        if (!formData.name || !formData.template.name || !formData.scheduledAt) {
            return;
        }

        setCreating(true);
        setTimeout(() => {
            const now = new Date().toISOString();
            const created: Campaign = {
                _id: newId("cmp"),
                orgId: "demo-org",
                name: formData.name,
                description: formData.description || "",
                type: formData.type,
                status: "draft",
                scheduledAt: formData.scheduledAt,
                template: { name: formData.template.name, language: formData.template.language },
                audience: {
                    type: formData.audience.type,
                    filters: formData.audience.filters,
                    customPhoneNumbers: formData.audience.customPhoneNumbers,
                },
                metrics: {
                    targetCount: 0,
                    sentCount: 0,
                    deliveredCount: 0,
                    readCount: 0,
                    failedCount: 0,
                    respondedCount: 0,
                },
                createdAt: now,
                updatedAt: now,
            };

            setCampaigns((prev) => [created, ...prev]);
            setShowCreateDialog(false);
            resetForm();
            setCreating(false);
        }, 500);
    }

    async function handleCampaignAction(
        campaignId: string,
        action: "schedule" | "pause" | "resume" | "cancel" | "delete"
    ) {
        setActionLoading(campaignId);

        setTimeout(() => {
            setCampaigns((prev) => {
                if (action === "delete") {
                    return prev.filter((c) => c._id !== campaignId);
                }

                return prev.map((c) => {
                    if (c._id !== campaignId) return c;
                    const updatedAt = new Date().toISOString();
                    switch (action) {
                        case "schedule":
                            return { ...c, status: "scheduled", updatedAt };
                        case "pause":
                            return { ...c, status: "paused", updatedAt };
                        case "resume":
                            return { ...c, status: "active", updatedAt };
                        case "cancel":
                            return { ...c, status: "cancelled", updatedAt };
                    }
                }) as Campaign[];
            });

            setSelectedCampaign(null);
            setActionLoading(null);
        }, 450);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                            <p className="text-gray-600 mt-1">Create and manage marketing campaigns</p>
                        </div>
                        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Campaign
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Campaigns" }]} />

                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search campaigns..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="paused">Paused</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="event">Event</SelectItem>
                                    <SelectItem value="promotional">Promotional</SelectItem>
                                    <SelectItem value="announcement">Announcement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : filteredCampaigns.length === 0 ? (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                                <p className="text-gray-500 mb-4">
                                    {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                                        ? "Try adjusting your filters"
                                        : "Create campaigns that will be available for users to run."}
                                </p>
                                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Campaign
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Scheduled</TableHead>
                                    <TableHead>Metrics</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCampaigns.map((campaign) => (
                                    <TableRow
                                        key={campaign._id}
                                        className="cursor-pointer"
                                        onClick={() => setSelectedCampaign(campaign)}
                                    >
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{campaign.name}</p>
                                                <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                                    {campaign.description || "No description"}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {campaign.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusBadge(campaign.status).className}>
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(campaign.status)}
                                                    <span className="capitalize">{campaign.status}</span>
                                                </span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {campaign.scheduledAt
                                                ? new Date(campaign.scheduledAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <span className="text-gray-500">Sent:</span> <span className="font-medium">{campaign.metrics.sentCount}</span>
                                                <span className="mx-2 text-gray-300">|</span>
                                                <span className="text-gray-500">Read:</span> <span className="font-medium">{campaign.metrics.readCount}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {campaign.status === "draft" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleCampaignAction(campaign._id, "schedule")}
                                                        disabled={actionLoading === campaign._id}
                                                    >
                                                        {actionLoading === campaign._id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Send className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                                {campaign.status === "active" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleCampaignAction(campaign._id, "pause")}
                                                        disabled={actionLoading === campaign._id}
                                                    >
                                                        <Pause className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {campaign.status === "paused" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleCampaignAction(campaign._id, "resume")}
                                                        disabled={actionLoading === campaign._id}
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {["draft", "scheduled"].includes(campaign.status) && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => handleCampaignAction(campaign._id, "cancel")}
                                                        disabled={actionLoading === campaign._id}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </main>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Campaign</DialogTitle>
                        <DialogDescription>Set up a new marketing campaign to reach your customers</DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="details" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="audience">Audience</TabsTrigger>
                            <TabsTrigger value="template">Template</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Campaign Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Diwali 2025 Offer"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    placeholder="Brief description of this campaign"
                                    value={formData.description || ""}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Campaign Type *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value as CreateCampaignRequest["type"] })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="event">Event (Diwali, New Year, etc.)</SelectItem>
                                        <SelectItem value="promotional">Promotional</SelectItem>
                                        <SelectItem value="announcement">Announcement</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <DateTimePicker
                                label="Schedule For *"
                                value={formData.scheduledAt}
                                onChange={(value) => setFormData({ ...formData, scheduledAt: value })}
                                minDate={new Date().toISOString().split("T")[0]}
                                required
                            />
                        </TabsContent>

                        <TabsContent value="audience" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Target Audience</Label>
                                <Select
                                    value={formData.audience.type}
                                    onValueChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            audience: { type: value as "all" | "segment" | "custom" },
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Customers</SelectItem>
                                        <SelectItem value="segment">Customer Segment</SelectItem>
                                        <SelectItem value="custom">Custom List</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.audience.type === "segment" && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium">Segment Filters</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Minimum Visits</Label>
                                            <Input
                                                type="number"
                                                placeholder="e.g., 2"
                                                value={(formData.audience.filters as any)?.minVisits || ""}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        audience: {
                                                            ...formData.audience,
                                                            filters: {
                                                                ...(formData.audience.filters || {}),
                                                                minVisits: e.target.value ? parseInt(e.target.value) : undefined,
                                                            },
                                                        },
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Max Days Since Last Visit</Label>
                                            <Input
                                                type="number"
                                                placeholder="e.g., 90"
                                                value={(formData.audience.filters as any)?.maxDaysSinceLastVisit || ""}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        audience: {
                                                            ...formData.audience,
                                                            filters: {
                                                                ...(formData.audience.filters || {}),
                                                                maxDaysSinceLastVisit: e.target.value ? parseInt(e.target.value) : undefined,
                                                            },
                                                        },
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Minimum Total Spend (₹)</Label>
                                            <Input
                                                type="number"
                                                placeholder="e.g., 5000"
                                                value={(formData.audience.filters as any)?.minTotalSpend || ""}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        audience: {
                                                            ...formData.audience,
                                                            filters: {
                                                                ...(formData.audience.filters || {}),
                                                                minTotalSpend: e.target.value ? parseInt(e.target.value) : undefined,
                                                            },
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        Audience preview will be available after backend integration.
                                    </div>
                                </div>
                            )}

                            {formData.audience.type === "custom" && (
                                <div className="space-y-2">
                                    <Label>Phone Numbers (one per line)</Label>
                                    <textarea
                                        className="w-full min-h-[120px] p-3 border rounded-md text-sm"
                                        placeholder="91XXXXXXXXXX\n91XXXXXXXXXX"
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                audience: {
                                                    ...formData.audience,
                                                    customPhoneNumbers: e.target.value.split("\n").filter(Boolean),
                                                },
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="template" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>WhatsApp Template *</Label>
                                {templates.length > 0 ? (
                                    <Select
                                        value={formData.template.name}
                                        onValueChange={(name) =>
                                            setFormData({
                                                ...formData,
                                                template: { ...formData.template, name },
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates
                                                .filter((t) => t.status === "APPROVED")
                                                .map((t) => (
                                                    <SelectItem key={t.name} value={t.name}>
                                                        {t.name} ({t.language})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        placeholder="Enter template name (backend integration pending)"
                                        value={formData.template.name}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                template: { ...formData.template, name: e.target.value },
                                            })
                                        }
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Language</Label>
                                <Select
                                    value={formData.template.language}
                                    onValueChange={(language) =>
                                        setFormData({
                                            ...formData,
                                            template: { ...formData.template, language },
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="en_US">English (US)</SelectItem>
                                        <SelectItem value="hi">Hindi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.template.name && (
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium mb-2">Template Preview</h4>
                                    <div className="text-sm text-gray-600">
                                        {templates
                                            .find((t) => t.name === formData.template.name)
                                            ?.components.filter((c: any) => c.type === "BODY")
                                            .map((c: any) => c.text)
                                            .join("\n") || "No preview available"}
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCampaign} disabled={creating}>
                            {creating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Creating...
                                </>
                            ) : (
                                "Create Campaign"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
                <DialogContent className="max-w-lg">
                    {selectedCampaign && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedCampaign.name}</DialogTitle>
                                <DialogDescription>{selectedCampaign.description || "No description provided"}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Status</span>
                                    <Badge className={getStatusBadge(selectedCampaign.status).className}>{selectedCampaign.status}</Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Type</span>
                                    <span className="capitalize">{selectedCampaign.type}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Template</span>
                                    <span>{selectedCampaign.template.name}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Scheduled</span>
                                    <span>{selectedCampaign.scheduledAt ? new Date(selectedCampaign.scheduledAt).toLocaleString() : "Not scheduled"}</span>
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">Metrics</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{selectedCampaign.metrics.sentCount}</p>
                                            <p className="text-sm text-gray-500">Sent</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{selectedCampaign.metrics.deliveredCount}</p>
                                            <p className="text-sm text-gray-500">Delivered</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{selectedCampaign.metrics.readCount}</p>
                                            <p className="text-sm text-gray-500">Read</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                {selectedCampaign.status === "draft" && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="text-red-600"
                                            onClick={() => handleCampaignAction(selectedCampaign._id, "delete")}
                                            disabled={!!actionLoading}
                                        >
                                            Delete
                                        </Button>
                                        <Button onClick={() => handleCampaignAction(selectedCampaign._id, "schedule")} disabled={!!actionLoading}>
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Schedule
                                        </Button>
                                    </>
                                )}
                                {selectedCampaign.status === "active" && (
                                    <Button
                                        variant="outline"
                                        onClick={() => handleCampaignAction(selectedCampaign._id, "pause")}
                                        disabled={!!actionLoading}
                                    >
                                        Pause Campaign
                                    </Button>
                                )}
                                {selectedCampaign.status === "paused" && (
                                    <Button onClick={() => handleCampaignAction(selectedCampaign._id, "resume")} disabled={!!actionLoading}>
                                        Resume Campaign
                                    </Button>
                                )}
                                {["scheduled", "active"].includes(selectedCampaign.status) && (
                                    <Button
                                        variant="outline"
                                        className="text-red-600"
                                        onClick={() => handleCampaignAction(selectedCampaign._id, "cancel")}
                                        disabled={!!actionLoading}
                                    >
                                        Cancel Campaign
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
