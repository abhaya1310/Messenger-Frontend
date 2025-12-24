"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, UploadCloud, Download } from "lucide-react";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { setSelectedOrgId } from "@/lib/selected-org";

type ImportUploadResponse = {
    success: boolean;
    jobId: string;
    status: "queued" | "processing" | "completed" | "failed" | string;
    deduped?: boolean;
};

type ImportStatusResponse = {
    success: boolean;
    data?: {
        jobId?: string;
        status?: "queued" | "processing" | "completed" | "failed" | string;
        stats?: {
            created?: number;
            updated?: number;
            failed?: number;
            total?: number;
        };
        error?: string;
        message?: string;
        updatedAt?: string;
        createdAt?: string;
    };
    jobId?: string;
    status?: string;
    stats?: any;
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

export default function AdminOrgGuestImportPage() {
    const params = useParams<{ orgId: string }>();
    const orgId = params.orgId;
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const [deduped, setDeduped] = useState<boolean | null>(null);
    const [stats, setStats] = useState<{ created?: number; updated?: number; failed?: number; total?: number } | null>(null);

    const pollRef = useRef<number | null>(null);

    const canUpload = useMemo(() => {
        if (!file) return false;
        const name = (file.name || "").toLowerCase();
        return name.endsWith(".csv") || name.endsWith(".xlsx");
    }, [file]);

    const stopPolling = () => {
        if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const fetchStatus = async (id: string) => {
        const token = getAuthToken();
        if (!token) throw new Error("Unauthorized");

        const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/guests/import/${encodeURIComponent(id)}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const json = (await safeJson(res)) as ImportStatusResponse;
        if (!res.ok) {
            throw new Error((json as any)?.error || (json as any)?.message || "Failed to fetch job status.");
        }

        const status = (json as any)?.data?.status ?? (json as any)?.status;
        const s = (json as any)?.data?.stats ?? (json as any)?.stats;
        setJobStatus(status || null);
        if (s && typeof s === "object") {
            setStats({
                created: typeof s.created === "number" ? s.created : undefined,
                updated: typeof s.updated === "number" ? s.updated : undefined,
                failed: typeof s.failed === "number" ? s.failed : undefined,
                total: typeof s.total === "number" ? s.total : undefined,
            });
        }

        return String(status || "").toLowerCase();
    };

    const startPolling = (id: string) => {
        stopPolling();
        pollRef.current = window.setInterval(async () => {
            try {
                const st = await fetchStatus(id);
                if (st === "completed" || st === "failed") {
                    stopPolling();
                }
            } catch {
                // ignore transient polling errors
            }
        }, 3000);
    };

    const onUpload = async () => {
        setError(null);
        if (!file) {
            setError("Please choose a file.");
            return;
        }
        if (!canUpload) {
            setError("Only .csv or .xlsx files are supported.");
            return;
        }

        setUploading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${encodeURIComponent(orgId)}/guests/import`)}`);
                return;
            }

            const form = new FormData();
            form.set("file", file, file.name);

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/guests/import`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: form,
            });

            const json = (await safeJson(res)) as ImportUploadResponse;
            if (!res.ok) {
                throw new Error((json as any)?.error || (json as any)?.message || "Failed to upload file.");
            }

            const nextJobId = (json as any)?.jobId;
            if (!nextJobId) {
                throw new Error("Upload succeeded but jobId was missing.");
            }

            setJobId(nextJobId);
            setJobStatus((json as any)?.status || "queued");
            setDeduped(typeof (json as any)?.deduped === "boolean" ? (json as any).deduped : null);

            await fetchStatus(nextJobId);
            startPolling(nextJobId);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to upload file.");
        } finally {
            setUploading(false);
        }
    };

    const onRefreshStatus = async () => {
        if (!jobId) return;
        setError(null);
        try {
            const st = await fetchStatus(jobId);
            if (st === "completed" || st === "failed") {
                stopPolling();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to refresh status.");
        }
    };

    const errorsCsvHref = jobId
        ? `/api/admin/org/${encodeURIComponent(orgId)}/guests/import/${encodeURIComponent(jobId)}/errors.csv`
        : null;

    useEffect(() => {
        setSelectedOrgId(orgId);
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Guests</h1>
                        <p className="text-gray-600 mt-1">Upload a .csv or .xlsx to import guest data for this organisation.</p>
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
                        { label: "Bulk Upload" },
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
                        <CardTitle>Upload file</CardTitle>
                        <CardDescription>Backend will enqueue an import job. You can monitor status below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="guest-import-file">Excel/CSV file</Label>
                            <Input
                                id="guest-import-file"
                                type="file"
                                accept=".csv,.xlsx"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                disabled={uploading}
                            />
                            <p className="text-xs text-muted-foreground">Accepted: .xlsx, .csv. Field name: file.</p>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={onUpload} disabled={uploading || !file} className="gap-2">
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                Upload
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>Import job</CardTitle>
                                <CardDescription>Polls status every few seconds while queued/processing.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={onRefreshStatus} disabled={!jobId} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Job ID</div>
                                <div className="font-mono text-sm break-all">{jobId || "—"}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Status</div>
                                <div className="text-sm font-medium">{jobStatus || "—"}</div>
                                {deduped !== null ? (
                                    <div className="text-xs text-muted-foreground">Deduped: {deduped ? "Yes" : "No"}</div>
                                ) : null}
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
                                <div className="text-xs text-muted-foreground">Total</div>
                                <div className="text-lg font-semibold">{formatNumber(stats?.total)}</div>
                            </div>
                        </div>

                        {errorsCsvHref ? (
                            <div className="flex gap-2">
                                <Button variant="outline" asChild className="gap-2" disabled={!jobId}>
                                    <a href={errorsCsvHref} target="_blank" rel="noreferrer">
                                        <Download className="h-4 w-4" />
                                        Download errors.csv
                                    </a>
                                </Button>
                            </div>
                        ) : null}

                        <div className="text-xs text-muted-foreground">
                            Processing is async and usually handled by cron. If status stays queued/processing for a long time, ensure the scheduler is running.
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
