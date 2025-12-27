"use client";

import { useEffect, useMemo, useState } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
    Calendar,
    CheckCircle,
    Clock,
    Loader2,
    Megaphone,
    Plus,
    Search,
    Trash2,
    XCircle,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";
import type {
    CampaignRun,
    CampaignRunStatus,
    CampaignDefinitionSummary,
} from "@/lib/types/campaign-run";
import type { PosSegment, PosSegmentsListResponse } from "@/lib/types/pos-segments";

function statusBadgeVariant(status: CampaignRunStatus) {
    switch (status) {
        case "scheduled":
            return "outline" as const;
        case "waiting_for_credits":
            return "outline" as const;
        case "blocked_stale_segment":
            return "outline" as const;
        case "needs_manual_review":
            return "destructive" as const;
        case "running":
            return "default" as const;
        case "completed":
            return "success" as const;
        case "failed":
            return "destructive" as const;
        case "cancelled":
            return "secondary" as const;
        case "draft":
        default:
            return "secondary" as const;
    }
}

function statusLabel(status: CampaignRunStatus): string {
    switch (status) {
        case "waiting_for_credits":
            return "Waiting for credits";
        case "blocked_stale_segment":
            return "Blocked (stale segment)";
        case "needs_manual_review":
            return "Needs manual review";
        default:
            return status;
    }
}

function statusIcon(status: CampaignRunStatus) {
    switch (status) {
        case "draft":
            return <Clock className="h-4 w-4" />;
        case "scheduled":
            return <Calendar className="h-4 w-4" />;
        case "waiting_for_credits":
            return <Clock className="h-4 w-4" />;
        case "blocked_stale_segment":
            return <Clock className="h-4 w-4" />;
        case "needs_manual_review":
            return <XCircle className="h-4 w-4" />;
        case "running":
            return <Loader2 className="h-4 w-4 animate-spin" />;
        case "completed":
            return <CheckCircle className="h-4 w-4" />;
        case "cancelled":
            return <XCircle className="h-4 w-4" />;
        case "failed":
            return <XCircle className="h-4 w-4" />;
        default:
            return <Clock className="h-4 w-4" />;
    }
}

async function parseJsonSafe(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

async function fetchCreditsPrecheckOrThrow(runId: string, token: string) {
    const precheckRes = await fetch(`/api/campaign-runs/${encodeURIComponent(runId)}/precheck-credits`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const precheckJson = await parseJsonSafe(precheckRes);
    if (!precheckRes.ok) {
        const msg = (precheckJson as any)?.error || (precheckJson as any)?.message || "Failed to run credits precheck";
        throw new Error(msg);
    }

    return (precheckJson as any)?.data as any;
}

export default function CampaignRunsClient() {
    const { orgId } = useAuth();
    const [runs, setRuns] = useState<CampaignRun[]>([]);
    const [definitions, setDefinitions] = useState<CampaignDefinitionSummary[]>([]);
    const [posEnabled, setPosEnabled] = useState(false);

    const [segments, setSegments] = useState<PosSegment[]>([]);
    const [segmentsLoading, setSegmentsLoading] = useState(false);
    const [segmentsError, setSegmentsError] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<CampaignRunStatus | "all">("all");

    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);

    const [createDefinitionId, setCreateDefinitionId] = useState<string>("");
    const [createName, setCreateName] = useState<string>("");
    const [createSegmentId, setCreateSegmentId] = useState<string>("");
    const [createTemplateParams, setCreateTemplateParams] = useState<Record<string, string>>({});
    const [createFireAt, setCreateFireAt] = useState<string>("");

    const [selectedRun, setSelectedRun] = useState<CampaignRun | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const [creditsPrecheck, setCreditsPrecheck] = useState<any | null>(null);
    const [creditsPrecheckLoading, setCreditsPrecheckLoading] = useState(false);
    const [creditsPrecheckError, setCreditsPrecheckError] = useState<string | null>(null);

    const [runEditName, setRunEditName] = useState<string>("");
    const [runEditFireAt, setRunEditFireAt] = useState<string>("");
    const [runEditSegmentId, setRunEditSegmentId] = useState<string>("");
    const [runEditTemplateParams, setRunEditTemplateParams] = useState<Record<string, string>>({});
    const [runSaving, setRunSaving] = useState(false);

    const filteredRuns = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return runs
            .filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))
            .filter((r) => {
                if (!q) return true;
                const def = r.campaignDefinitionId;
                return (
                    (def?.name || "").toLowerCase().includes(q) ||
                    (def?.key || "").toLowerCase().includes(q) ||
                    (r._id || "").toLowerCase().includes(q)
                );
            });
    }, [runs, searchQuery, statusFilter]);

    useEffect(() => {
        const runId = selectedRun?._id;
        if (!runId) {
            setCreditsPrecheck(null);
            setCreditsPrecheckError(null);
            setCreditsPrecheckLoading(false);
            return;
        }

        if (selectedRun?.status !== "draft") {
            setCreditsPrecheck(null);
            setCreditsPrecheckError(null);
            setCreditsPrecheckLoading(false);
            return;
        }

        let cancelled = false;
        const run = async () => {
            setCreditsPrecheck(null);
            setCreditsPrecheckError(null);
            setCreditsPrecheckLoading(true);
            try {
                const token = getAuthToken();
                if (!token) throw new Error("Unauthorized");
                const precheck = await fetchCreditsPrecheckOrThrow(runId, token);
                if (!cancelled) {
                    setCreditsPrecheck(precheck);
                }
            } catch (e) {
                if (!cancelled) {
                    setCreditsPrecheckError(e instanceof Error ? e.message : "Failed to load credits precheck");
                }
            } finally {
                if (!cancelled) {
                    setCreditsPrecheckLoading(false);
                }
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [selectedRun?._id, selectedRun?.status]);

    const loadAll = async () => {
        setError(null);
        setLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                setError("Unauthorized");
                setLoading(false);
                return;
            }

            const headers: Record<string, string> = {
                Authorization: `Bearer ${token}`,
                ...(orgId ? { "X-ORG-ID": orgId } : {}),
            };

            const [capRes, defsRes, runsRes] = await Promise.all([
                fetch("/api/campaign-runs/capabilities", { headers }),
                fetch("/api/campaign-runs/definitions", { headers }),
                fetch(
                    `/api/campaign-runs${statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : ""
                    }`,
                    { headers }
                ),
            ]);

            const capJson = await parseJsonSafe(capRes);
            if (!capRes.ok) {
                const msg = (capJson as any)?.error || (capJson as any)?.message || "Failed to load capabilities";
                throw new Error(msg);
            }
            setPosEnabled(!!(capJson as any)?.data?.posIntegrationEnabled);

            const defsJson = await parseJsonSafe(defsRes);
            if (!defsRes.ok) {
                const msg = (defsJson as any)?.error || (defsJson as any)?.message || "Failed to load catalog";
                throw new Error(msg);
            }
            setDefinitions(((defsJson as any)?.data || []) as CampaignDefinitionSummary[]);

            const runsJson = await parseJsonSafe(runsRes);
            if (!runsRes.ok) {
                const msg = (runsJson as any)?.error || (runsJson as any)?.message || "Failed to load campaign runs";
                throw new Error(msg);
            }
            setRuns(((runsJson as any)?.data || []) as CampaignRun[]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load campaign runs");
        } finally {
            setLoading(false);
        }
    };

    const loadSegments = async () => {
        setSegmentsError(null);
        setSegmentsLoading(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch("/api/admin/pos/segments", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (data as any)?.error || (data as any)?.message || "Failed to load segments";
                throw new Error(msg);
            }

            const parsed = data as PosSegmentsListResponse;
            setSegments(Array.isArray((parsed as any)?.data) ? ((parsed as any).data as PosSegment[]) : []);
        } catch (e) {
            setSegmentsError(e instanceof Error ? e.message : "Failed to load segments");
            setSegments([]);
        } finally {
            setSegmentsLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const openCreateDialog = () => {
        setCreateDefinitionId("");
        setCreateName("");
        setCreateSegmentId("");
        setCreateFireAt("");
        setCreateTemplateParams({});
        setShowCreate(true);
        loadSegments();
    };

    const createRun = async () => {
        setError(null);

        if (!createDefinitionId || !createFireAt || !createSegmentId) {
            setError("Please fill in all required fields");
            return;
        }

        const hasAnyTemplateParams = Object.values(createTemplateParams || {}).some((v) => String(v ?? "").trim().length > 0);
        if (!hasAnyTemplateParams) {
            setError("Please set template parameters before creating a run");
            return;
        }

        const selectedDefinition = definitions.find((d) => d._id === createDefinitionId);
        if (!selectedDefinition) {
            setError("Please select a campaign from the published catalog");
            return;
        }

        setCreating(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch("/api/campaign-runs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    campaignDefinitionId: createDefinitionId,
                    fireAt: createFireAt,
                    name: createName.trim() || undefined,
                    audience: { source: "segment" },
                    segmentId: createSegmentId,
                    templateParams: createTemplateParams,
                }),
            });

            const data = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (data as any)?.error || (data as any)?.message || "Failed to create run";
                throw new Error(msg);
            }

            const created = (data as any)?.data as CampaignRun;
            setShowCreate(false);
            setSelectedRun(created);
            setRuns((prev) => [created, ...prev]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create run");
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        if (!selectedRun) return;
        setRunEditName(selectedRun.name || "");
        setRunEditFireAt(selectedRun.fireAt || "");
        setRunEditSegmentId(selectedRun.segmentId || "");
        setRunEditTemplateParams(selectedRun.templateParams || {});
    }, [selectedRun]);

    const canEditSelectedRun = (run: CampaignRun) => {
        return run.status === "draft" || run.status === "scheduled";
    };

    const saveSelectedRun = async () => {
        if (!selectedRun) return;
        if (!canEditSelectedRun(selectedRun)) return;

        setError(null);
        setRunSaving(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch(`/api/campaign-runs/${encodeURIComponent(selectedRun._id)}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: runEditName.trim() || undefined,
                    fireAt: runEditFireAt || undefined,
                    audience: { source: "segment" },
                    segmentId: runEditSegmentId || undefined,
                    templateParams: runEditTemplateParams,
                }),
            });

            const data = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (data as any)?.error || (data as any)?.message || "Failed to update run";
                throw new Error(msg);
            }

            const updated = (data as any)?.data as CampaignRun;
            setSelectedRun(updated);
            setRuns((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update run");
        } finally {
            setRunSaving(false);
        }
    };

    const refreshRun = async (id: string) => {
        const token = getAuthToken();
        if (!token) return;

        const res = await fetch(`/api/campaign-runs/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await parseJsonSafe(res);
        if (!res.ok) return;

        const updated = (data as any)?.data as CampaignRun;
        setSelectedRun(updated);
        setRuns((prev) => prev.map((r) => (r._id === id ? updated : r)));
    };

    const doAction = async (run: CampaignRun, action: "schedule" | "cancel" | "delete") => {
        setError(null);
        setActionLoadingId(run._id);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            if (action === "schedule") {
                if (run.status !== "draft") {
                    throw new Error("Only draft runs can be scheduled");
                }
                if (!run.segmentId) {
                    throw new Error("Segment is required before scheduling");
                }
                const params = run.templateParams || {};
                const hasAny = Object.values(params).some((v) => String(v ?? "").trim().length > 0);
                if (!hasAny) {
                    throw new Error("Template parameters are required before scheduling");
                }
            }

            const url =
                action === "delete"
                    ? `/api/campaign-runs/${encodeURIComponent(run._id)}`
                    : `/api/campaign-runs/${encodeURIComponent(run._id)}/${action}`;

            const res = await fetch(url, {
                method: action === "delete" ? "DELETE" : "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (data as any)?.error || (data as any)?.message || `Failed to ${action}`;
                throw new Error(msg);
            }

            await refreshRun(run._id);
            if (action === "schedule") {
                setCreditsPrecheck(null);
                setCreditsPrecheckError(null);
            }
            if (action === "delete") {
                setSelectedRun(null);
                setRuns((prev) => prev.filter((r) => r._id !== run._id));
            }

            if (action !== "delete") {
                await loadAll();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Action failed");
        } finally {
            setActionLoadingId(null);
        }
    };

    const minDate = new Date().toISOString().split("T")[0];

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Campaign Runs</h1>
                            <p className="text-gray-600 mt-1">Create and manage runs from the campaign catalog</p>
                        </div>
                        <Button onClick={openCreateDialog} className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Run
                        </Button>
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

                {/* Campaign catalog (admin-created definitions) */}
                <Card className="mb-6">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base">Campaign Catalog</CardTitle>
                            <CardDescription>Published campaigns configured by your admin.</CardDescription>
                        </div>
                        <Button size="sm" onClick={openCreateDialog} className="gap-1">
                            <Megaphone className="h-4 w-4" />
                            <span>New Run</span>
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {definitions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No published campaigns are available yet. Ask your admin to publish a campaign definition.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {definitions.map((d) => {
                                    const tmpl: any = d.template as any;
                                    const previewMessage = tmpl?.preview?.message;
                                    const category = tmpl?.category;
                                    return (
                                        <Card
                                            key={d._id}
                                            className="cursor-pointer hover:shadow-sm transition-shadow"
                                            onClick={() => {
                                                setCreateDefinitionId(d._id);
                                                setShowCreate(true);
                                            }}
                                        >
                                            <CardHeader className="pb-2 space-y-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <CardTitle className="text-base truncate">{d.name}</CardTitle>
                                                        <CardDescription className="text-xs break-all">{d.key}</CardDescription>
                                                    </div>
                                                    {category && (
                                                        <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">
                                                            {category}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-gray-700 line-clamp-3">
                                                    {previewMessage || "Preview not configured"}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[240px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by campaign name or key..."
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
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="waiting_for_credits">Waiting for credits</SelectItem>
                                    <SelectItem value="blocked_stale_segment">Blocked (stale segment)</SelectItem>
                                    <SelectItem value="needs_manual_review">Needs manual review</SelectItem>
                                    <SelectItem value="running">Running</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {statusFilter === "waiting_for_credits" && (
                            <p className="text-sm text-muted-foreground mt-3">
                                Blocked until credits are refilled.
                            </p>
                        )}
                        {statusFilter === "blocked_stale_segment" && (
                            <p className="text-sm text-muted-foreground mt-3">
                                Segment is stale; contact admin to recompute.
                            </p>
                        )}
                        {statusFilter === "needs_manual_review" && (
                            <p className="text-sm text-muted-foreground mt-3">
                                Backend detected a credit mismatch; admin intervention required.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : filteredRuns.length === 0 ? (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No runs found</h3>
                                <p className="text-gray-500 mb-4">Create a campaign run to start sending.</p>
                                <Button onClick={openCreateDialog} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    New Run
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
                                    <TableHead>Status</TableHead>
                                    <TableHead>Fire At</TableHead>
                                    <TableHead>Audience</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRuns.map((r) => {
                                    const busy = actionLoadingId === r._id;
                                    return (
                                        <TableRow key={r._id} className="cursor-pointer" onClick={() => setSelectedRun(r)}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{r.campaignDefinitionId?.name || r.campaignDefinitionId?.key || r._id}</p>
                                                    <p className="text-sm text-gray-500">{r.campaignDefinitionId?.key}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusBadgeVariant(r.status)} className="capitalize">
                                                    <span className="flex items-center gap-1">
                                                        {statusIcon(r.status)}
                                                        <span>{statusLabel(r.status)}</span>
                                                    </span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{r.fireAt ? new Date(r.fireAt).toLocaleString() : "—"}</TableCell>
                                            <TableCell className="uppercase text-sm">{r.audience?.source || "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {r.status === "draft" && (
                                                        <Button size="sm" variant="outline" onClick={() => doAction(r, "schedule")} disabled={busy}>
                                                            Schedule
                                                        </Button>
                                                    )}
                                                    {(r.status === "draft" || r.status === "scheduled" || r.status === "waiting_for_credits") && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 hover:text-red-700"
                                                            onClick={() => doAction(r, "cancel")}
                                                            disabled={busy}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                    {r.status === "draft" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 hover:text-red-700 gap-2"
                                                            onClick={() => doAction(r, "delete")}
                                                            disabled={busy}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Campaign Run</DialogTitle>
                        <DialogDescription>Select a published campaign, select a segment, and schedule when to send.</DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="campaign" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="campaign">Campaign</TabsTrigger>
                            <TabsTrigger value="audience">Audience</TabsTrigger>
                            <TabsTrigger value="schedule">Schedule</TabsTrigger>
                        </TabsList>

                        <TabsContent value="campaign" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Run Name (optional)</Label>
                                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Diwali Re-engagement 2025" />
                            </div>
                            <div className="space-y-2">
                                <Label>Campaign *</Label>
                                <Select
                                    value={createDefinitionId}
                                    onValueChange={(id) => {
                                        setCreateDefinitionId(id);
                                        const def = definitions.find((d) => d._id === id);
                                        const tmpl: any = def?.template as any;
                                        const samples = (tmpl?.preview?.sampleValues || {}) as Record<string, string>;
                                        setCreateTemplateParams({ ...samples });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a campaign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {definitions.map((d) => (
                                            <SelectItem key={d._id} value={d._id}>
                                                {d.name} ({d.key})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {createDefinitionId && (() => {
                                const def = definitions.find((d) => d._id === createDefinitionId);
                                const tmpl: any = def?.template as any;
                                const sampleValues = (tmpl?.preview?.sampleValues || {}) as Record<string, string>;
                                const variableKeys = Object.keys(sampleValues);
                                if (variableKeys.length === 0) return null;

                                return (
                                    <div className="space-y-2 border-t pt-4">
                                        <Label className="text-sm">Template Parameters</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Override the template variable values to be used when this run sends messages.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {variableKeys.map((k) => (
                                                <div key={k} className="space-y-1">
                                                    <div className="text-xs font-medium text-gray-700">Variable {k}</div>
                                                    <Input
                                                        value={createTemplateParams[k] ?? sampleValues[k] ?? ""}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setCreateTemplateParams((prev) => ({
                                                                ...prev,
                                                                [k]: value,
                                                            }));
                                                        }}
                                                        placeholder={sampleValues[k]}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </TabsContent>

                        <TabsContent value="audience" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Segment *</Label>
                                <Select value={createSegmentId} onValueChange={(v) => setCreateSegmentId(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={segmentsLoading ? "Loading segments..." : "Select a segment"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {segments.map((s) => (
                                            <SelectItem key={s._id} value={s._id}>
                                                {s.name}{typeof s.audience?.size === "number" ? ` (${s.audience.size.toLocaleString()})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {segmentsError && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {segmentsError}
                                    </p>
                                )}
                                {!posEnabled && (
                                    <p className="text-sm text-muted-foreground">
                                        POS integration is not enabled for this org. Segment availability may be limited.
                                    </p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-4 mt-4">
                            <DateTimePicker label="Fire At *" value={createFireAt} onChange={setCreateFireAt} minDate={minDate} required />
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
                            Cancel
                        </Button>
                        <Button onClick={createRun} disabled={creating} className="gap-2">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Create Run
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedRun} onOpenChange={() => {
                setSelectedRun(null);
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {selectedRun && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedRun.campaignDefinitionId?.name || selectedRun._id}</DialogTitle>
                                <DialogDescription>{selectedRun.campaignDefinitionId?.key}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Status</span>
                                    <Badge variant={statusBadgeVariant(selectedRun.status)} className="capitalize">
                                        <span className="flex items-center gap-1">
                                            {statusIcon(selectedRun.status)}
                                            <span>{statusLabel(selectedRun.status)}</span>
                                        </span>
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <div className="text-gray-500">Fire At</div>
                                        <div className="font-medium">{selectedRun.fireAt ? new Date(selectedRun.fireAt).toLocaleString() : "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Queued</div>
                                        <div className="font-medium">{typeof selectedRun.queuedCount === "number" ? selectedRun.queuedCount.toLocaleString() : "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Sent / Failed</div>
                                        <div className="font-medium">
                                            {(typeof selectedRun.sentCount === "number" ? selectedRun.sentCount : 0).toLocaleString()} / {(typeof selectedRun.failedCount === "number" ? selectedRun.failedCount : 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-4">
                                    <h4 className="font-medium">Run Details</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input value={runEditName} onChange={(e) => setRunEditName(e.target.value)} disabled={!canEditSelectedRun(selectedRun) || runSaving} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Segment</Label>
                                            <Select value={runEditSegmentId} onValueChange={(v) => setRunEditSegmentId(v)} disabled={!canEditSelectedRun(selectedRun) || runSaving}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={segmentsLoading ? "Loading segments..." : "Select a segment"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {segments.map((s) => (
                                                        <SelectItem key={s._id} value={s._id}>
                                                            {s.name}{typeof s.audience?.size === "number" ? ` (${s.audience.size.toLocaleString()})` : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Fire At</Label>
                                        <DateTimePicker label="" value={runEditFireAt} onChange={setRunEditFireAt} minDate={minDate} required={false as any} />
                                    </div>

                                    {selectedRun.campaignDefinitionId && (() => {
                                        const tmpl: any = selectedRun.campaignDefinitionId?.template as any;
                                        const sampleValues = (tmpl?.preview?.sampleValues || {}) as Record<string, string>;
                                        const keys = Array.from(new Set([...Object.keys(sampleValues), ...Object.keys(runEditTemplateParams || {})]));
                                        if (keys.length === 0) return null;
                                        return (
                                            <div className="space-y-2">
                                                <Label>Template Parameters</Label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {keys.map((k) => (
                                                        <div key={k} className="space-y-1">
                                                            <div className="text-xs font-medium text-gray-700">Variable {k}</div>
                                                            <Input
                                                                value={runEditTemplateParams[k] ?? sampleValues[k] ?? ""}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    setRunEditTemplateParams((prev) => ({
                                                                        ...prev,
                                                                        [k]: value,
                                                                    }));
                                                                }}
                                                                placeholder={sampleValues[k]}
                                                                disabled={!canEditSelectedRun(selectedRun) || runSaving}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {canEditSelectedRun(selectedRun) && (
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" onClick={loadSegments} disabled={segmentsLoading}>
                                                Refresh Segments
                                            </Button>
                                            <Button onClick={saveSelectedRun} disabled={runSaving}>
                                                {runSaving ? "Saving..." : "Save"}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {(selectedRun.status === "draft" || selectedRun.status === "scheduled") && (
                                    <div className="border-t pt-4">
                                        <h4 className="font-medium mb-2">Credits Check (precheck)</h4>

                                        {creditsPrecheckLoading && (
                                            <p className="text-sm text-muted-foreground" role="status">
                                                Checking credits...
                                            </p>
                                        )}

                                        {creditsPrecheckError && !creditsPrecheckLoading && (
                                            <p className="text-sm text-destructive" role="alert">
                                                {creditsPrecheckError}
                                            </p>
                                        )}

                                        {creditsPrecheck && !creditsPrecheckLoading && !creditsPrecheckError && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <div className="text-gray-500">Sufficient</div>
                                                    <div className="font-medium">{String(Boolean(creditsPrecheck.isSufficient))}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Total Audience</div>
                                                    <div className="font-medium">{Number(creditsPrecheck.totalAudienceCount || 0).toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Credits Required</div>
                                                    <div className="font-medium">{Number(creditsPrecheck.creditsRequired || 0).toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Credits Available</div>
                                                    <div className="font-medium">{Number(creditsPrecheck.creditsAvailable || 0).toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Eligible Count</div>
                                                    <div className="font-medium">{Number(creditsPrecheck.eligibleCount || 0).toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Throttled (24h)</div>
                                                    <div className="font-medium">{Number(creditsPrecheck.throttledCount || 0).toLocaleString()}</div>
                                                </div>
                                                {creditsPrecheck.isSufficient === false && (
                                                    <div className="md:col-span-2">
                                                        <p className="text-sm text-amber-700">
                                                            Insufficient credits. You can still schedule: the run will move to <span className="font-medium">waiting_for_credits</span>.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-2">Audience</h4>
                                    <div className="text-sm text-gray-600">Source: {selectedRun.audience?.source?.toUpperCase()}</div>
                                    {selectedRun.segmentId ? (() => {
                                        const seg = segments.find((s) => s._id === selectedRun.segmentId);
                                        return (
                                            <div className="text-sm text-gray-600">
                                                Segment: {seg?.name || selectedRun.segmentId}
                                                {typeof seg?.audience?.size === "number" ? ` (${seg.audience.size.toLocaleString()})` : ""}
                                            </div>
                                        );
                                    })() : (
                                        <div className="text-sm text-gray-600">Segment: —</div>
                                    )}
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-2">Credits</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <div className="text-gray-500">Reserved</div>
                                            <div className="font-medium">{Number(selectedRun.credits?.reservedAmount ?? 0).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">Debited</div>
                                            <div className="font-medium">{Number(selectedRun.credits?.debitedAmount ?? 0).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">Released</div>
                                            <div className="font-medium">{Number(selectedRun.credits?.releasedAmount ?? 0).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {selectedRun.lastError && (
                                    <div className="text-sm text-destructive">Last error: {selectedRun.lastError}</div>
                                )}
                            </div>

                            <DialogFooter>
                                {selectedRun.status === "draft" && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 gap-2"
                                            onClick={() => doAction(selectedRun, "delete")}
                                            disabled={actionLoadingId === selectedRun._id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                        <Button
                                            onClick={() => doAction(selectedRun, "schedule")}
                                            disabled={
                                                actionLoadingId === selectedRun._id ||
                                                creditsPrecheckLoading
                                            }
                                        >
                                            Schedule
                                        </Button>
                                    </>
                                )}

                                {(selectedRun.status === "draft" ||
                                    selectedRun.status === "scheduled" ||
                                    selectedRun.status === "waiting_for_credits" ||
                                    selectedRun.status === "blocked_stale_segment") && (
                                        <Button
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() => doAction(selectedRun, "cancel")}
                                            disabled={actionLoadingId === selectedRun._id}
                                        >
                                            Cancel
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
