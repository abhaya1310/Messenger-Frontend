"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Download, Zap } from "lucide-react";
import { clearAuth, fetchMe, getAuthToken } from "@/lib/auth";
import { setSelectedOrgId } from "@/lib/selected-org";

type ImportStatusResponse = {
    success: boolean;
    data?: {
        status?: "queued" | "processing" | "completed" | "failed" | string;
        stats?: {
            totalRows?: number;
            processedRows?: number;
            created?: number;
            updated?: number;
            failed?: number;
            deduped?: number;
        };
        cursor?: number;
        lastError?: string | null;
    };
    status?: string;
    stats?: any;
    cursor?: number;
    lastError?: string | null;
    error?: string;
    message?: string;
};

async function safeJson(res: Response) {
    return (await res.json().catch(() => ({}))) as any;
}

function formatNumber(value?: number): string {
    if (typeof value !== "number" || Number.isNaN(value)) return "—";
    try {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
    } catch {
        return String(value);
    }
}

export default function AdminOrgGuestImportJobPage() {
    const params = useParams<{ orgId: string; jobId: string }>();
    const orgId = params.orgId;
    const jobId = params.jobId;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const [stats, setStats] = useState<{
        totalRows?: number;
        processedRows?: number;
        created?: number;
        updated?: number;
        failed?: number;
        deduped?: number;
    } | null>(null);
    const [cursor, setCursor] = useState<number | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [canProcessNow, setCanProcessNow] = useState(false);
    const [processingNow, setProcessingNow] = useState(false);

    const pollRef = useRef<number | null>(null);
    const processInFlightRef = useRef(false);
    const lastProcessAtRef = useRef<number>(0);

    const stopPolling = () => {
        if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const fetchStatus = async () => {
        const token = getAuthToken();
        if (!token) throw new Error("Unauthorized");

        const res = await fetch(
            `/api/admin/org/${encodeURIComponent(orgId)}/guests/import/${encodeURIComponent(jobId)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const json = (await safeJson(res)) as ImportStatusResponse;
        if (!res.ok) {
            if (res.status === 401) {
                clearAuth();
                router.replace(
                    `/login?reason=session_expired&next=${encodeURIComponent(
                        `/admin/orgs/${encodeURIComponent(orgId)}/guests/import/${encodeURIComponent(jobId)}`
                    )}`
                );
                return "unauthorized";
            }
            throw new Error((json as any)?.error || (json as any)?.message || "Failed to fetch job status.");
        }

        const status = (json as any)?.data?.status ?? (json as any)?.status;
        const s = (json as any)?.data?.stats ?? (json as any)?.stats;
        const c = (json as any)?.data?.cursor ?? (json as any)?.cursor;
        const le = (json as any)?.data?.lastError ?? (json as any)?.lastError;

        setJobStatus(status || null);
        setCursor(typeof c === "number" ? c : null);
        setLastError(typeof le === "string" ? le : le === null ? null : null);

        if (s && typeof s === "object") {
            setStats({
                totalRows: typeof s.totalRows === "number" ? s.totalRows : undefined,
                processedRows: typeof s.processedRows === "number" ? s.processedRows : undefined,
                created: typeof s.created === "number" ? s.created : undefined,
                updated: typeof s.updated === "number" ? s.updated : undefined,
                failed: typeof s.failed === "number" ? s.failed : undefined,
                deduped: typeof s.deduped === "number" ? s.deduped : undefined,
            });
        }

        return String(status || "").toLowerCase();
    };

    const startPolling = () => {
        stopPolling();
        pollRef.current = window.setInterval(async () => {
            try {
                const st = await fetchStatus();
                if (st === "completed" || st === "failed") {
                    stopPolling();
                }
            } catch {
                // ignore transient polling errors
            }
        }, 4000);
    };

    const onRefresh = async () => {
        setError(null);
        setRefreshing(true);
        try {
            const st = await fetchStatus();
            if (st === "completed" || st === "failed") {
                stopPolling();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to refresh.");
        } finally {
            setRefreshing(false);
        }
    };

    const onProcessNow = async () => {
        const now = Date.now();
        if (processInFlightRef.current) return;
        if (now - lastProcessAtRef.current < 12000) return;

        setError(null);
        processInFlightRef.current = true;
        lastProcessAtRef.current = now;
        setProcessingNow(true);

        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${encodeURIComponent(orgId)}/guests/import`)}`);
                return;
            }

            const res = await fetch("/api/cron/guests/import/process", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await safeJson(res);
            if (!res.ok) {
                throw new Error((json as any)?.error || (json as any)?.message || "Failed to trigger processing.");
            }

            await onRefresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to trigger processing.");
        } finally {
            processInFlightRef.current = false;
            setProcessingNow(false);
        }
    };

    const canClickProcessNow = canProcessNow && !processingNow && Date.now() - lastProcessAtRef.current >= 12000;

    const statusLower = (jobStatus || "").toLowerCase();
    const processedRows = typeof stats?.processedRows === "number" ? stats.processedRows : 0;
    const totalRows = typeof stats?.totalRows === "number" ? stats.totalRows : 0;
    const progressPct = totalRows > 0 ? Math.min(100, Math.floor((processedRows / totalRows) * 100)) : 0;

    const canDownloadErrors = statusLower === "completed" || processedRows > 0;

    const errorsCsvHref = useMemo(() => {
        return `/api/admin/org/${encodeURIComponent(orgId)}/guests/import/${encodeURIComponent(jobId)}/errors.csv`;
    }, [orgId, jobId]);

    const canPoll = statusLower === "queued" || statusLower === "processing";

    useEffect(() => {
        setSelectedOrgId(orgId);
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    useEffect(() => {
        const run = async () => {
            const token = getAuthToken();
            if (!token) {
                setCanProcessNow(false);
                return;
            }
            const me = await fetchMe(token).catch(() => null);
            setCanProcessNow(me?.role === "admin");
        };
        run();
    }, []);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                await fetchStatus();
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load job status.");
            } finally {
                setLoading(false);
            }
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, jobId]);

    useEffect(() => {
        if (!canPoll) {
            stopPolling();
            return;
        }
        startPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canPoll]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--connectnow-accent-strong)]" />
                    <p className="text-gray-600">Loading import job...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <h1 className="text-3xl font-bold text-gray-900">Guest Import Status</h1>
                        <p className="text-gray-600 mt-1">Progress is persisted in the backend. You can safely refresh this page.</p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <Breadcrumb
                    items={[
                        { label: "Admin", href: "/admin" },
                        { label: "Orgs", href: "/admin/orgs" },
                        { label: orgId, href: `/admin/orgs/${encodeURIComponent(orgId)}` },
                        { label: "Guests" },
                        { label: "Bulk Upload", href: `/admin/orgs/${encodeURIComponent(orgId)}/guests/import` },
                        { label: jobId },
                    ]}
                />

                {error ? (
                    <Card className="border-destructive/30">
                        <CardContent className="pt-6">
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        </CardContent>
                    </Card>
                ) : null}

                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>Import job</CardTitle>
                                <CardDescription>Polls every 3–5 seconds while queued/processing.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={onRefresh} className="gap-2" disabled={refreshing}>
                                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    Refresh
                                </Button>
                                {canProcessNow ? (
                                    <Button variant="outline" onClick={onProcessNow} className="gap-2" disabled={!canClickProcessNow}>
                                        {processingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                        Process now
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Job ID</div>
                                <div className="font-mono text-sm break-all">{jobId}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Status</div>
                                <div className="text-sm font-medium">{jobStatus || "—"}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Cursor</div>
                                <div className="text-sm font-medium">{cursor === null ? "—" : formatNumber(cursor)}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">
                                    {totalRows > 0 ? `${formatNumber(processedRows)}/${formatNumber(totalRows)} (${progressPct}%)` : "—"}
                                </span>
                            </div>
                            <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                                <div className="h-2 bg-gray-900" style={{ width: `${progressPct}%` }} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-xs text-muted-foreground">Created</div>
                                <div className="text-lg font-semibold">{formatNumber(stats?.created)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Updated</div>
                                <div className="text-lg font-semibold">{formatNumber(stats?.updated)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Failed</div>
                                <div className="text-lg font-semibold">{formatNumber(stats?.failed)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Deduped</div>
                                <div className="text-lg font-semibold">{formatNumber(stats?.deduped)}</div>
                            </div>
                        </div>

                        {statusLower === "failed" && lastError ? (
                            <div className="text-sm text-destructive" role="alert">
                                {lastError}
                            </div>
                        ) : null}

                        {canDownloadErrors ? (
                            <div className="flex gap-2">
                                <Button variant="outline" asChild className="gap-2">
                                    <a href={errorsCsvHref} target="_blank" rel="noreferrer">
                                        <Download className="h-4 w-4" />
                                        Download errors CSV
                                    </a>
                                </Button>
                            </div>
                        ) : null}

                        <div className="text-xs text-muted-foreground">
                            Import completion speed depends on cron frequency. Progress should increase over time because processedRows is persisted.
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
