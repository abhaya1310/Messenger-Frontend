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
    FileUp,
    Loader2,
    Megaphone,
    Plus,
    Search,
    Trash2,
    XCircle,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import type {
    CampaignRun,
    CampaignRunStatus,
    CampaignAudienceSource,
    CampaignDefinitionSummary,
    UploadCsvAudienceResponse,
} from "@/lib/types/campaign-run";

function statusBadgeVariant(status: CampaignRunStatus) {
    switch (status) {
        case "scheduled":
            return "outline" as const;
        case "waiting_for_credits":
            return "outline" as const;
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
        default:
            return status;
    }
}

function formatInsufficientCreditsMessage(input: {
    bucket?: string;
    creditsRequired?: number;
    creditsAvailable?: number;
    eligibleCount?: number;
    throttledCount?: number;
    error?: string;
}): string {
    const bucket = input.bucket || "credits";
    const required = typeof input.creditsRequired === "number" ? input.creditsRequired : undefined;
    const available = typeof input.creditsAvailable === "number" ? input.creditsAvailable : undefined;
    const eligibleCount = typeof input.eligibleCount === "number" ? input.eligibleCount : undefined;
    const throttledCount = typeof input.throttledCount === "number" ? input.throttledCount : undefined;

    const parts: string[] = [];
    if (typeof required === "number" && typeof available === "number") {
        parts.push(`Insufficient ${bucket} credits: required ${required}, available ${available}.`);
    } else {
        parts.push(input.error || `Insufficient ${bucket} credits.`);
    }

    if (typeof eligibleCount === "number") {
        parts.push(`Eligible recipients: ${eligibleCount}.`);
    }
    if (typeof throttledCount === "number" && throttledCount > 0) {
        parts.push(`Throttled (24h): ${throttledCount}.`);
    }

    return parts.join(" ");
}

function statusIcon(status: CampaignRunStatus) {
    switch (status) {
        case "draft":
            return <Clock className="h-4 w-4" />;
        case "scheduled":
            return <Calendar className="h-4 w-4" />;
        case "waiting_for_credits":
            return <Clock className="h-4 w-4" />;
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
    const precheckRes = await fetch(`/api/campaign-runs/${encodeURIComponent(runId)}/credits/precheck`, {
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
    const [runs, setRuns] = useState<CampaignRun[]>([]);
    const [definitions, setDefinitions] = useState<CampaignDefinitionSummary[]>([]);
    const [posEnabled, setPosEnabled] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<CampaignRunStatus | "all">("all");

    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);

    const [createDefinitionId, setCreateDefinitionId] = useState<string>("");
    const [createStartDate, setCreateStartDate] = useState<string>("");
    const [createEndDate, setCreateEndDate] = useState<string>("");
    const [createFireAt, setCreateFireAt] = useState<string>("");
    const [createAudienceSource, setCreateAudienceSource] = useState<CampaignAudienceSource>("csv");

    const [selectedRun, setSelectedRun] = useState<CampaignRun | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const [creditsPrecheck, setCreditsPrecheck] = useState<any | null>(null);
    const [creditsPrecheckLoading, setCreditsPrecheckLoading] = useState(false);
    const [creditsPrecheckError, setCreditsPrecheckError] = useState<string | null>(null);

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState<UploadCsvAudienceResponse["data"] | null>(null);

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

            const headers = { Authorization: `Bearer ${token}` };

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

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const openCreateDialog = () => {
        setCreateDefinitionId("");
        setCreateStartDate("");
        setCreateEndDate("");
        setCreateFireAt("");
        setCreateAudienceSource("csv");
        setCsvFile(null);
        setCsvResult(null);
        setShowCreate(true);
    };

    const createRun = async () => {
        setError(null);

        if (!createDefinitionId || !createStartDate || !createEndDate || !createFireAt) {
            setError("Please fill in all required fields");
            return;
        }

        const selectedDefinition = definitions.find((d) => d._id === createDefinitionId);
        if (!selectedDefinition) {
            setError("Please select a campaign from the published catalog");
            return;
        }

        if (createAudienceSource === "pos" && !posEnabled) {
            setError("POS integration is not enabled for this org");
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
                    startDate: createStartDate,
                    endDate: createEndDate,
                    fireAt: createFireAt,
                    audience: { source: createAudienceSource },
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
                const precheck = await fetchCreditsPrecheckOrThrow(run._id, token);
                setCreditsPrecheck(precheck);
                if (precheck && precheck.isSufficient === false) {
                    throw new Error(
                        formatInsufficientCreditsMessage({
                            bucket: precheck.bucket,
                            creditsRequired: precheck.creditsRequired,
                            creditsAvailable: precheck.creditsAvailable,
                            eligibleCount: precheck.eligibleCount,
                            throttledCount: precheck.throttledCount,
                            error: undefined,
                        })
                    );
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
                if (res.status === 409 && (data as any)?.code === "INSUFFICIENT_CREDITS") {
                    const d = (data as any)?.data || {};
                    throw new Error(
                        formatInsufficientCreditsMessage({
                            bucket: d.bucket,
                            creditsRequired: d.creditsRequired,
                            creditsAvailable: d.creditsAvailable,
                            eligibleCount: d.eligibleCount,
                            throttledCount: d.throttledCount,
                            error: (data as any)?.error,
                        })
                    );
                }

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

    const uploadCsv = async (run: CampaignRun) => {
        setError(null);
        setCsvResult(null);

        if (!csvFile) {
            setError("Please select a CSV file");
            return;
        }

        setCsvUploading(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const formData = new FormData();
            formData.append("file", csvFile);

            const res = await fetch(`/api/campaign-runs/${encodeURIComponent(run._id)}/audience/csv`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (data as any)?.error || (data as any)?.message || "CSV upload failed";
                throw new Error(msg);
            }

            setCsvResult((data as any)?.data || null);
            await refreshRun(run._id);
        } catch (e) {
            setError(e instanceof Error ? e.message : "CSV upload failed");
        } finally {
            setCsvUploading(false);
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
                                    <SelectItem value="running">Running</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
                        <DialogDescription>Select a published campaign and configure schedule and audience.</DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="campaign" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="campaign">Campaign</TabsTrigger>
                            <TabsTrigger value="schedule">Schedule</TabsTrigger>
                            <TabsTrigger value="audience">Audience</TabsTrigger>
                        </TabsList>

                        <TabsContent value="campaign" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Campaign *</Label>
                                <Select value={createDefinitionId} onValueChange={setCreateDefinitionId}>
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
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-4 mt-4">
                            <DateTimePicker label="Start Date *" value={createStartDate} onChange={setCreateStartDate} minDate={minDate} required />
                            <DateTimePicker label="End Date *" value={createEndDate} onChange={setCreateEndDate} minDate={minDate} required />
                            <DateTimePicker label="Fire At *" value={createFireAt} onChange={setCreateFireAt} minDate={minDate} required />
                        </TabsContent>

                        <TabsContent value="audience" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Audience Source *</Label>
                                <Select value={createAudienceSource} onValueChange={(v) => setCreateAudienceSource(v as CampaignAudienceSource)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="csv">CSV Upload</SelectItem>
                                        <SelectItem value="pos" disabled={!posEnabled}>
                                            POS Customers
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {!posEnabled && createAudienceSource === "pos" && (
                                <p className="text-sm text-muted-foreground">POS integration is not enabled for this org.</p>
                            )}
                            {createAudienceSource === "csv" && (
                                <p className="text-sm text-muted-foreground">
                                    After creating the run, upload a CSV to add recipients. Scheduling requires a successful upload.
                                </p>
                            )}
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
                setCsvFile(null);
                setCsvResult(null);
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
                                        <div className="text-gray-500">Start</div>
                                        <div className="font-medium">{selectedRun.startDate ? new Date(selectedRun.startDate).toLocaleString() : "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">End</div>
                                        <div className="font-medium">{selectedRun.endDate ? new Date(selectedRun.endDate).toLocaleString() : "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Fire At</div>
                                        <div className="font-medium">{selectedRun.fireAt ? new Date(selectedRun.fireAt).toLocaleString() : "—"}</div>
                                    </div>
                                </div>

                                {selectedRun.status === "draft" && (
                                    <div className="border-t pt-4">
                                        <h4 className="font-medium mb-2">Credits Check</h4>

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
                                                    <div className="text-gray-500">Bucket</div>
                                                    <div className="font-medium capitalize">{creditsPrecheck.bucket}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Sufficient</div>
                                                    <div className="font-medium">{String(Boolean(creditsPrecheck.isSufficient))}</div>
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
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-2">Audience</h4>
                                    <div className="text-sm text-gray-600">Source: {selectedRun.audience?.source?.toUpperCase()}</div>

                                    {selectedRun.audience?.source === "csv" && (
                                        <div className="mt-3 space-y-3">
                                            <div className="flex flex-col gap-2">
                                                <Label>Upload CSV</Label>
                                                <Input
                                                    type="file"
                                                    accept=".csv,text/csv"
                                                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button onClick={() => uploadCsv(selectedRun)} disabled={csvUploading || !csvFile} className="gap-2">
                                                    {csvUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                                                    Upload
                                                </Button>
                                                <Button variant="outline" onClick={() => refreshRun(selectedRun._id)}>
                                                    Refresh
                                                </Button>
                                            </div>

                                            {csvResult && (
                                                <Card>
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base">Upload Summary</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="grid grid-cols-3 gap-3 text-sm">
                                                            <div>
                                                                <div className="text-gray-500">Valid</div>
                                                                <div className="font-medium">{csvResult.validCount}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-gray-500">Invalid</div>
                                                                <div className="font-medium">{csvResult.invalidCount}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-gray-500">Total</div>
                                                                <div className="font-medium">{csvResult.totalRows}</div>
                                                            </div>
                                                        </div>
                                                        {csvResult.errors?.length > 0 && (
                                                            <div className="mt-3">
                                                                <div className="text-gray-500 text-sm">Errors</div>
                                                                <ul className="mt-1 text-sm text-gray-700 list-disc pl-5">
                                                                    {csvResult.errors.slice(0, 5).map((er, idx) => (
                                                                        <li key={idx}>{er}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    )}
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
                                                creditsPrecheckLoading ||
                                                (creditsPrecheck && creditsPrecheck.isSufficient === false)
                                            }
                                        >
                                            Schedule
                                        </Button>
                                    </>
                                )}

                                {(selectedRun.status === "draft" || selectedRun.status === "scheduled" || selectedRun.status === "waiting_for_credits") && (
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
