"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, RefreshCcw, Search, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getAuthToken, getCurrentOrgId } from "@/lib/auth";
import type { Campaign, CreateCampaignRequest } from "@/lib/types/campaign";

async function parseJsonSafe(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

function campaignId(c: Campaign): string {
    return String((c as any)?._id || (c as any)?.id || "");
}

function statusBadgeVariant(status: Campaign["status"]) {
    switch (status) {
        case "preparing":
            return "warning" as const;
        case "scheduled":
            return "outline" as const;
        case "active":
            return "default" as const;
        case "completed":
            return "success" as const;
        case "failed":
            return "destructive" as const;
        case "cancelled":
            return "secondary" as const;
        case "paused":
            return "outline" as const;
        case "draft":
        default:
            return "secondary" as const;
    }
}

function statusIcon(status: Campaign["status"]) {
    switch (status) {
        case "preparing":
            return <Loader2 className="h-4 w-4 animate-spin" />;
        case "scheduled":
            return <Calendar className="h-4 w-4" />;
        case "active":
            return <Clock className="h-4 w-4" />;
        case "completed":
            return <CheckCircle className="h-4 w-4" />;
        case "failed":
            return <XCircle className="h-4 w-4" />;
        case "cancelled":
            return <XCircle className="h-4 w-4" />;
        default:
            return <Clock className="h-4 w-4" />;
    }
}

function safeNumber(value: string): number | undefined {
    const v = String(value || "").trim();
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return n;
}

function parseCsv(value: string): string[] {
    return (value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function parsePhoneList(value: string): string[] {
    return (value || "")
        .split(/[\n,\r\t ]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
}

type ParamMode = "static" | "dynamic";

type ParamDraft = {
    mode: ParamMode;
    staticValue: string;
    dynamicField: string;
};

export default function CampaignsClient() {
    const router = useRouter();
    const { orgId: authOrgId } = useAuth();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<Campaign["status"] | "all">("all");

    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);

    const pollingRef = useRef<number | null>(null);

    const [createName, setCreateName] = useState("");
    const [createDescription, setCreateDescription] = useState("");

    const [createTemplateName, setCreateTemplateName] = useState("");
    const [createTemplateLanguage, setCreateTemplateLanguage] = useState("en_US");

    const [createParamCount, setCreateParamCount] = useState<string>("0");

    const [createScheduledAt, setCreateScheduledAt] = useState<string>("");

    const [createAudienceType, setCreateAudienceType] = useState<CreateCampaignRequest["audience"]["type"]>("all");

    const [createMinVisits, setCreateMinVisits] = useState("");
    const [createMaxDaysSinceLastVisit, setCreateMaxDaysSinceLastVisit] = useState("");
    const [createMinTotalSpend, setCreateMinTotalSpend] = useState("");
    const [createOutletsCsv, setCreateOutletsCsv] = useState("");
    const [createHasEmail, setCreateHasEmail] = useState<"any" | "true" | "false">("any");
    const [createHasBirthday, setCreateHasBirthday] = useState<"any" | "true" | "false">("any");

    const [createCustomPhoneNumbersRaw, setCreateCustomPhoneNumbersRaw] = useState("");

    const [paramDrafts, setParamDrafts] = useState<Record<number, ParamDraft>>({});

    const paramCount = useMemo(() => {
        const raw = String(createParamCount || "").trim();
        const n = raw ? Number(raw) : 0;
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(Math.floor(n), 50);
    }, [createParamCount]);

    const paramPositions = useMemo(() => {
        const out: number[] = [];
        for (let i = 1; i <= paramCount; i++) out.push(i);
        return out;
    }, [paramCount]);

    useEffect(() => {
        const next: Record<number, ParamDraft> = {};
        for (const pos of paramPositions) {
            next[pos] = paramDrafts[pos] || { mode: "static", staticValue: "", dynamicField: "" };
        }
        setParamDrafts(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramPositions.join(",")]);

    const filteredCampaigns = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return (campaigns || [])
            .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
            .filter((c) => {
                if (!q) return true;
                return (
                    (c.name || "").toLowerCase().includes(q) ||
                    (c.template?.name || "").toLowerCase().includes(q) ||
                    campaignId(c).toLowerCase().includes(q)
                );
            });
    }, [campaigns, searchQuery, statusFilter]);

    const stopPolling = () => {
        if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const startPollingIfNeeded = (items: Campaign[]) => {
        const anyPreparing = items.some((c) => c.status === "preparing");
        if (!anyPreparing) {
            stopPolling();
            return;
        }
        if (pollingRef.current) return;
        pollingRef.current = window.setInterval(() => {
            loadCampaigns({ silent: true });
        }, 3000);
    };

    const loadCampaigns = async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) {
            setLoading(true);
        }
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                setError("Unauthorized");
                setCampaigns([]);
                return;
            }

            const orgId = getCurrentOrgId() || authOrgId;
            const headers: Record<string, string> = {
                Authorization: `Bearer ${token}`,
            };
            if (orgId) headers["X-ORG-ID"] = orgId;

            const params = new URLSearchParams();
            params.set("limit", "50");
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/campaigns?${params.toString()}`, {
                method: "GET",
                headers,
            });

            const json = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (json as any)?.error || (json as any)?.message || "Failed to load campaigns";
                throw new Error(msg);
            }

            const data = (json as any)?.data ?? json;
            const items = Array.isArray(data?.campaigns) ? data.campaigns : Array.isArray(data) ? data : [];
            setCampaigns(items as Campaign[]);
            startPollingIfNeeded(items as Campaign[]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load campaigns");
            setCampaigns([]);
        } finally {
            if (!opts?.silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadCampaigns();
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const openCreate = () => {
        setError(null);
        setShowCreate(true);

        setCreateName("");
        setCreateDescription("");
        setCreateTemplateName("");
        setCreateTemplateLanguage("en_US");
        setCreateParamCount("0");
        setCreateScheduledAt("");

        setCreateAudienceType("all");
        setCreateMinVisits("");
        setCreateMaxDaysSinceLastVisit("");
        setCreateMinTotalSpend("");
        setCreateOutletsCsv("");
        setCreateHasEmail("any");
        setCreateHasBirthday("any");

        setCreateCustomPhoneNumbersRaw("");
        setParamDrafts({});
    };

    const createCampaign = async () => {
        setError(null);

        if (!createName.trim() || !createScheduledAt) {
            setError("Please fill in required fields");
            return;
        }
        if (!createTemplateName.trim() || !createTemplateLanguage.trim()) {
            setError("Template is required");
            return;
        }

        if (createAudienceType === "custom") {
            const nums = parsePhoneList(createCustomPhoneNumbersRaw);
            if (nums.length === 0) {
                setError("Please provide at least one phone number");
                return;
            }
        }

        setCreating(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const orgId = getCurrentOrgId() || authOrgId;
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };
            if (orgId) headers["X-ORG-ID"] = orgId;

            const maxIndex = paramCount;
            const staticParams: string[] = [];
            const dynamicParameters: Array<{ position: number; field: string }> = [];

            for (let i = 1; i <= maxIndex; i++) {
                const d = paramDrafts[i] || { mode: "static", staticValue: "", dynamicField: "" };
                if (d.mode === "dynamic") {
                    staticParams.push("");
                    if (String(d.dynamicField || "").trim()) {
                        dynamicParameters.push({ position: i, field: String(d.dynamicField).trim() });
                    }
                } else {
                    staticParams.push(String(d.staticValue || ""));
                }
            }

            const filters: any = {};
            const minVisits = safeNumber(createMinVisits);
            if (minVisits !== undefined) filters.minVisits = minVisits;

            const maxDaysSinceLastVisit = safeNumber(createMaxDaysSinceLastVisit);
            if (maxDaysSinceLastVisit !== undefined) filters.maxDaysSinceLastVisit = maxDaysSinceLastVisit;

            const minTotalSpend = safeNumber(createMinTotalSpend);
            if (minTotalSpend !== undefined) filters.minTotalSpend = minTotalSpend;

            const outlets = parseCsv(createOutletsCsv);
            if (outlets.length > 0) filters.outlets = outlets;

            if (createHasEmail !== "any") filters.hasEmail = createHasEmail === "true";
            if (createHasBirthday !== "any") filters.hasBirthday = createHasBirthday === "true";

            const payload: CreateCampaignRequest = {
                name: createName.trim(),
                description: createDescription.trim() || undefined,
                scheduledAt: createScheduledAt,
                template: {
                    name: createTemplateName.trim(),
                    language: createTemplateLanguage.trim(),
                    ...(maxIndex > 0 ? { parameters: staticParams } : {}),
                    ...(dynamicParameters.length > 0 ? { dynamicParameters } : {}),
                },
                audience: {
                    type: createAudienceType,
                    ...(createAudienceType === "custom"
                        ? { customPhoneNumbers: parsePhoneList(createCustomPhoneNumbersRaw) }
                        : createAudienceType === "all"
                            ? {}
                            : Object.keys(filters).length > 0
                                ? { filters }
                                : {}),
                },
            };

            const res = await fetch("/api/campaigns", {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });

            const json = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (json as any)?.error || (json as any)?.message || "Failed to create campaign";
                throw new Error(msg);
            }

            const created = ((json as any)?.data || (json as any)) as Campaign;
            const id = campaignId(created);
            setShowCreate(false);

            await loadCampaigns({ silent: true });

            if (id) {
                router.push(`/campaigns/${encodeURIComponent(id)}`);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create campaign");
        } finally {
            setCreating(false);
        }
    };

    const minDate = new Date().toISOString().split("T")[0];

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-start justify-between gap-4 py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                            <p className="text-gray-600 mt-1">Create campaigns. Audience is prepared asynchronously by the backend.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/campaigns/runs">Campaign Runs</Link>
                            </Button>
                            <Button onClick={openCreate} className="gap-2">
                                <Plus className="h-4 w-4" />
                                New Campaign
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Breadcrumb items={[{ label: "Campaigns" }]} />

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
                                        placeholder="Search by name or template..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="preparing">Preparing</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="paused">Paused</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="outline" onClick={() => loadCampaigns()} disabled={loading} className="gap-2">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                Refresh
                            </Button>
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
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
                                <p className="text-gray-500 mb-4">Create a campaign to start sending.</p>
                                <Button onClick={openCreate} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    New Campaign
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Scheduled At</TableHead>
                                    <TableHead>Template</TableHead>
                                    <TableHead>Reach</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCampaigns.map((c) => {
                                    const id = campaignId(c);
                                    const reachReady = c.status !== "preparing";
                                    const est = (c.audience as any)?.estimatedCount;
                                    const target = (c.metrics as any)?.targetCount;
                                    return (
                                        <TableRow
                                            key={id}
                                            className="cursor-pointer"
                                            onClick={() => id && router.push(`/campaigns/${encodeURIComponent(id)}`)}
                                        >
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{c.name || id}</div>
                                                    <div className="text-xs text-gray-500 break-all">{id}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusBadgeVariant(c.status)} className="capitalize">
                                                    <span className="flex items-center gap-1">
                                                        {statusIcon(c.status)}
                                                        <span>{c.status}</span>
                                                    </span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}</TableCell>
                                            <TableCell className="break-all">{c.template?.name || "—"}</TableCell>
                                            <TableCell>
                                                {c.status === "preparing" ? (
                                                    <span className="text-sm text-muted-foreground">Preparing audience…</span>
                                                ) : !reachReady ? (
                                                    "—"
                                                ) : (
                                                    <div className="text-sm">
                                                        <div>Estimated: {typeof est === "number" ? est.toLocaleString() : "—"}</div>
                                                        <div>Target: {typeof target === "number" ? target.toLocaleString() : "—"}</div>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </main>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New Campaign</DialogTitle>
                        <DialogDescription>
                            Campaign creation is async. After creating, the backend will prepare audience and the campaign will move from
                            preparing → scheduled.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="campaign" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="campaign">Campaign</TabsTrigger>
                            <TabsTrigger value="audience">Audience</TabsTrigger>
                            <TabsTrigger value="schedule">Schedule</TabsTrigger>
                        </TabsList>

                        <TabsContent value="campaign" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Diwali Blast 2025" />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="Optional" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Template Name *</Label>
                                    <Input
                                        value={createTemplateName}
                                        onChange={(e) => setCreateTemplateName(e.target.value)}
                                        placeholder="template_name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Language *</Label>
                                    <Input value={createTemplateLanguage} onChange={(e) => setCreateTemplateLanguage(e.target.value)} placeholder="en_US" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Body Parameter Count</Label>
                                <Input
                                    value={createParamCount}
                                    onChange={(e) => setCreateParamCount(e.target.value)}
                                    placeholder="e.g. 2"
                                />
                                <div className="text-xs text-muted-foreground">
                                    If your template has body variables like {"{{1}}"}, {"{{2}}"}, set this to 2.
                                </div>
                            </div>

                            {paramPositions.length > 0 ? (
                                <div className="border-t pt-4 space-y-3">
                                    <div>
                                        <div className="text-sm font-medium">Template Parameters</div>
                                        <div className="text-xs text-muted-foreground">
                                            Choose static values or dynamic fields. Dynamic values are resolved by the backend at send time.
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {paramPositions.map((i) => {
                                            const d = paramDrafts[i] || { mode: "static", staticValue: "", dynamicField: "" };
                                            return (
                                                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border p-3">
                                                    <div className="text-xs font-medium text-gray-700">{`{{${i}}}`}</div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Mode</Label>
                                                        <Select
                                                            value={d.mode}
                                                            onValueChange={(v) => {
                                                                setParamDrafts((prev) => ({
                                                                    ...prev,
                                                                    [i]: {
                                                                        ...prev[i],
                                                                        mode: v as ParamMode,
                                                                    },
                                                                }));
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="static">Static</SelectItem>
                                                                <SelectItem value="dynamic">Dynamic</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-1">
                                                        {d.mode === "dynamic" ? (
                                                            <>
                                                                <Label className="text-xs">Field</Label>
                                                                <Input
                                                                    value={d.dynamicField}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        setParamDrafts((prev) => ({
                                                                            ...prev,
                                                                            [i]: {
                                                                                ...prev[i],
                                                                                dynamicField: value,
                                                                            },
                                                                        }));
                                                                    }}
                                                                    placeholder="customer.name"
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Label className="text-xs">Value</Label>
                                                                <Input
                                                                    value={d.staticValue}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        setParamDrafts((prev) => ({
                                                                            ...prev,
                                                                            [i]: {
                                                                                ...prev[i],
                                                                                staticValue: value,
                                                                            },
                                                                        }));
                                                                    }}
                                                                    placeholder="Sample value"
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </TabsContent>

                        <TabsContent value="audience" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Audience Type *</Label>
                                <Select value={createAudienceType} onValueChange={(v) => setCreateAudienceType(v as any)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="segment">Segment (filters)</SelectItem>
                                        <SelectItem value="custom">Custom phone numbers</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {createAudienceType === "custom" ? (
                                <div className="space-y-2">
                                    <Label>Phone numbers *</Label>
                                    <Textarea
                                        value={createCustomPhoneNumbersRaw}
                                        onChange={(e) => setCreateCustomPhoneNumbersRaw(e.target.value)}
                                        placeholder="+919999999999\n+918888888888"
                                    />
                                    <div className="text-xs text-muted-foreground">
                                        Enter phone numbers separated by new lines or commas.
                                    </div>
                                </div>
                            ) : null}

                            {createAudienceType === "segment" ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Min Visits</Label>
                                            <Input value={createMinVisits} onChange={(e) => setCreateMinVisits(e.target.value)} placeholder="e.g. 3" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Days Since Last Visit</Label>
                                            <Input
                                                value={createMaxDaysSinceLastVisit}
                                                onChange={(e) => setCreateMaxDaysSinceLastVisit(e.target.value)}
                                                placeholder="e.g. 60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Min Total Spend</Label>
                                            <Input
                                                value={createMinTotalSpend}
                                                onChange={(e) => setCreateMinTotalSpend(e.target.value)}
                                                placeholder="e.g. 5000"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Outlets (comma separated outlet IDs)</Label>
                                        <Input value={createOutletsCsv} onChange={(e) => setCreateOutletsCsv(e.target.value)} placeholder="outlet_1,outlet_2" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Has Email</Label>
                                            <Select value={createHasEmail} onValueChange={(v) => setCreateHasEmail(v as any)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">Any</SelectItem>
                                                    <SelectItem value="true">Yes</SelectItem>
                                                    <SelectItem value="false">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Has Birthday</Label>
                                            <Select value={createHasBirthday} onValueChange={(v) => setCreateHasBirthday(v as any)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">Any</SelectItem>
                                                    <SelectItem value="true">Yes</SelectItem>
                                                    <SelectItem value="false">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        Audience count is computed by the backend after campaign creation.
                                    </div>
                                </div>
                            ) : null}

                            {createAudienceType === "all" ? (
                                <div className="text-sm text-muted-foreground">
                                    This campaign will target all eligible customers (backend exclusions still apply).
                                </div>
                            ) : null}
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-4 mt-4">
                            <DateTimePicker
                                label="Scheduled At *"
                                value={createScheduledAt}
                                onChange={setCreateScheduledAt}
                                minDate={minDate}
                                required
                            />
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
                            Cancel
                        </Button>
                        <Button onClick={createCampaign} disabled={creating} className="gap-2">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Create Campaign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
