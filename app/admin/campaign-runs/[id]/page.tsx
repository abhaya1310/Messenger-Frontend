"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AdminCampaignRunDiagnosticsResponse } from "@/lib/types/admin-campaign-run-diagnostics";

function fmt(n: unknown): string {
    return typeof n === "number" ? n.toLocaleString() : "—";
}

export default function AdminCampaignRunDiagnosticsPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const router = useRouter();

    const [data, setData] = useState<AdminCampaignRunDiagnosticsResponse["data"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showConfirm, setShowConfirm] = useState(false);
    const [reconciling, setReconciling] = useState(false);
    const [reconcileError, setReconcileError] = useState<string | null>(null);

    const invariants = useMemo(() => {
        const queued = typeof data?.queuedCount === "number" ? data.queuedCount : null;
        const sent = typeof data?.sentCount === "number" ? data.sentCount : null;
        const failed = typeof data?.failedCount === "number" ? data.failedCount : null;

        const reserved = typeof data?.credits?.reservedAmount === "number" ? data.credits.reservedAmount : null;
        const debited = typeof data?.credits?.debitedAmount === "number" ? data.credits.debitedAmount : null;
        const released = typeof data?.credits?.releasedAmount === "number" ? data.credits.releasedAmount : null;

        const countersOk = queued === null || sent === null || failed === null ? null : sent + failed === queued;
        const creditsOk = reserved === null || debited === null || released === null ? null : reserved === debited + released;

        return { countersOk, creditsOk };
    }, [data]);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/campaign-runs/${id}`)}`);
                return;
            }

            const res = await fetch(`/api/admin/campaign-runs/${encodeURIComponent(id)}/diagnostics`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/campaign-runs/${id}`)}`);
                    return;
                }
                setError(json?.error || json?.message || "Failed to load diagnostics");
                setData(null);
                return;
            }

            const parsed = json as AdminCampaignRunDiagnosticsResponse;
            setData(parsed?.data || null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load diagnostics");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const reconcile = async () => {
        setReconcileError(null);
        setReconciling(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch(`/api/admin/campaign-runs/${encodeURIComponent(id)}/reconcile`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                const msg = json?.error || json?.message || "Failed to reconcile";
                throw new Error(msg);
            }

            setShowConfirm(false);
            await load();
        } catch (e) {
            setReconcileError(e instanceof Error ? e.message : "Failed to reconcile");
        } finally {
            setReconciling(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Run Diagnostics</h1>
                        <p className="text-sm text-muted-foreground">Run ID: {id}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/admin/campaign-runs">Back</Link>
                        </Button>
                        <Button variant="outline" onClick={load} disabled={loading}>
                            Refresh
                        </Button>
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-destructive" role="alert">
                        {error}
                    </p>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Summary</CardTitle>
                        {data?.status ? <Badge variant="outline" className="capitalize">{data.status}</Badge> : null}
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : !data ? (
                            <p className="text-sm text-muted-foreground">No diagnostics data.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground">Queued</div>
                                    <div className="font-medium">{fmt(data.queuedCount)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Sent</div>
                                    <div className="font-medium">{fmt(data.sentCount)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Failed</div>
                                    <div className="font-medium">{fmt(data.failedCount)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Segment</div>
                                    <div className="font-medium">{data.segmentId || "—"}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Snapshot</div>
                                    <div className="font-medium">{data.snapshotId || "—"}</div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Invariants</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm">sentCount + failedCount == queuedCount</div>
                            <div className="text-sm font-medium">
                                {invariants.countersOk === null ? "—" : invariants.countersOk ? "OK" : "Mismatch"}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-sm">reservedAmount == debitedAmount + releasedAmount</div>
                            <div className="text-sm font-medium">
                                {invariants.creditsOk === null ? "—" : invariants.creditsOk ? "OK" : "Mismatch"}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Credits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <div className="text-muted-foreground">Reserved</div>
                                <div className="font-medium">{fmt(data?.credits?.reservedAmount)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Debited</div>
                                <div className="font-medium">{fmt(data?.credits?.debitedAmount)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Released</div>
                                <div className="font-medium">{fmt(data?.credits?.releasedAmount)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Manual Recovery</CardTitle>
                        <Button onClick={() => setShowConfirm(true)} disabled={loading || !data}>
                            Reconcile Run
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Re-derives expected credit state from queue + snapshot and attempts to fix stuck credits.
                        </p>
                    </CardContent>
                </Card>

                <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reconcile run?</DialogTitle>
                            <DialogDescription>
                                This will attempt to reconcile credits and may change the run status.
                            </DialogDescription>
                        </DialogHeader>

                        {reconcileError && (
                            <p className="text-sm text-destructive" role="alert">
                                {reconcileError}
                            </p>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={reconciling}>
                                Cancel
                            </Button>
                            <Button onClick={reconcile} disabled={reconciling}>
                                {reconciling ? "Reconciling..." : "Reconcile"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
