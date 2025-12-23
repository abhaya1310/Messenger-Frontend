"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, RefreshCcw, RotateCcw, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@/lib/auth";
import type { Segment, SegmentsListResponse, SegmentResponse } from "@/lib/types/segments";
import SegmentEditorDialog from "./segment-editor-dialog";

async function safeJson(res: Response) {
    return (await res.json().catch(() => ({}))) as any;
}

function segmentId(s: Segment): string {
    return String(s.id || s._id || "");
}

function formatNumber(value?: number): string {
    if (typeof value !== "number" || Number.isNaN(value)) return "—";
    try {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
    } catch {
        return String(value);
    }
}

function statusLabel(status?: string): string {
    const s = (status || "").toLowerCase();
    if (s === "ready") return "Ready";
    if (s === "failed") return "Failed";
    if (s === "computing") return "Computing";
    if (s === "active") return "Active";
    if (s === "draft") return "Draft";
    return status || "—";
}

function statusVariant(status?: string): "success" | "warning" | "destructive" | "secondary" | "outline" {
    const s = (status || "").toLowerCase();
    if (s === "ready") return "success";
    if (s === "failed") return "destructive";
    if (s === "computing") return "warning";
    if (s === "active") return "secondary";
    return "outline";
}

const palette = [
    "bg-emerald-100",
    "bg-sky-100",
    "bg-cyan-100",
    "bg-amber-100",
    "bg-violet-100",
    "bg-yellow-100",
    "bg-rose-100",
    "bg-lime-100",
];

export default function SegmentsClient() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [segments, setSegments] = useState<Segment[]>([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Segment | null>(null);

    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const pollingRef = useRef<Map<string, number>>(new Map());

    const totalReadySize = useMemo(() => {
        const sizes = segments
            .filter((s) => (s.status || "").toLowerCase() === "ready")
            .map((s) => (typeof s.estimatedSize === "number" ? s.estimatedSize : 0));
        return sizes.reduce((a, b) => a + b, 0);
    }, [segments]);

    const titleStats = useMemo(() => {
        const ready = segments.filter((s) => (s.status || "").toLowerCase() === "ready").length;
        const computing = segments.filter((s) => (s.status || "").toLowerCase() === "computing").length;
        return { ready, computing };
    }, [segments]);

    const stopPolling = (id: string) => {
        const existing = pollingRef.current.get(id);
        if (existing) {
            window.clearInterval(existing);
            pollingRef.current.delete(id);
        }
    };

    const startPolling = (id: string) => {
        if (!id) return;
        stopPolling(id);

        const intervalId = window.setInterval(async () => {
            try {
                const token = getAuthToken();
                if (!token) return;

                const res = await fetch(`/api/segments/${id}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const json = await safeJson(res);
                if (!res.ok) return;

                const parsed = json as SegmentResponse;
                const seg = (parsed?.data || json?.data) as Segment | undefined;
                if (!seg) return;

                setSegments((prev) => {
                    const next = [...prev];
                    const idx = next.findIndex((s) => segmentId(s) === id);
                    if (idx >= 0) next[idx] = { ...next[idx], ...seg };
                    else next.unshift(seg);
                    return next;
                });

                const status = (seg.status || "").toLowerCase();
                if (status === "ready" || status === "failed") stopPolling(id);
            } catch {
                return;
            }
        }, 3000);

        pollingRef.current.set(id, intervalId);
    };

    const loadSegments = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch("/api/segments?limit=50&skip=0", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await safeJson(res);
            if (!res.ok) {
                setSegments([]);
                setError(json?.error || json?.message || "Failed to load segments.");
                return;
            }

            const parsed = json as SegmentsListResponse;
            const items = (parsed?.data?.items || []) as Segment[];
            setSegments(Array.isArray(items) ? items : []);
        } catch (e) {
            setSegments([]);
            setError(e instanceof Error ? e.message : "Failed to load segments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSegments();

        return () => {
            for (const [, intervalId] of pollingRef.current) {
                window.clearInterval(intervalId);
            }
            pollingRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        for (const s of segments) {
            const id = segmentId(s);
            if (!id) continue;
            const st = (s.status || "").toLowerCase();
            if (st === "computing") startPolling(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [segments.map((s) => `${segmentId(s)}:${s.status}:${s.estimatedSize ?? ""}`).join("|")]);

    const openCreate = () => {
        setEditing(null);
        setDialogOpen(true);
    };

    const openEdit = (s: Segment) => {
        setEditing(s);
        setDialogOpen(true);
    };

    const onSaved = (seg: Segment) => {
        const id = segmentId(seg);
        setSegments((prev) => {
            const next = [...prev];
            const idx = next.findIndex((x) => segmentId(x) === id);
            if (idx >= 0) next[idx] = { ...next[idx], ...seg };
            else next.unshift(seg);
            return next;
        });
        if (id) startPolling(id);
    };

    const onRecompute = async (s: Segment) => {
        const id = segmentId(s);
        if (!id) return;

        setActionLoadingId(id);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch(`/api/segments/${id}/recompute`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await safeJson(res);
            if (!res.ok) {
                throw new Error(json?.error || json?.message || "Failed to recompute.");
            }

            setSegments((prev) => {
                const next = [...prev];
                const idx = next.findIndex((x) => segmentId(x) === id);
                if (idx >= 0) next[idx] = { ...next[idx], status: "computing" };
                return next;
            });

            startPolling(id);
        } finally {
            setActionLoadingId(null);
        }
    };

    const onDelete = async (s: Segment) => {
        const id = segmentId(s);
        if (!id) return;

        const ok = window.confirm(`Delete segment "${s.name}"?`);
        if (!ok) return;

        setActionLoadingId(id);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch(`/api/segments/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await safeJson(res);
            if (!res.ok) {
                throw new Error(json?.error || json?.message || "Failed to delete.");
            }

            stopPolling(id);
            setSegments((prev) => prev.filter((x) => segmentId(x) !== id));
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Customer Segmentation</h1>
                        <p className="text-sm text-muted-foreground">
                            Create segments to target campaigns. New segments often start in “Computing” until cron processes them.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={loadSegments} disabled={loading} className="gap-2">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            Refresh
                        </Button>
                        <Button onClick={openCreate} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Segment
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">Total: {segments.length}</Badge>
                    <Badge variant="success">Ready: {titleStats.ready}</Badge>
                    <Badge variant="warning">Computing: {titleStats.computing}</Badge>
                    <Badge variant="outline">Ready size sum: {formatNumber(totalReadySize)}</Badge>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading segments…
                        </div>
                    </div>
                ) : error ? (
                    <div className="space-y-3">
                        <p className="text-sm text-destructive" role="alert">
                            {error}
                        </p>
                        <Button variant="outline" onClick={loadSegments} disabled={loading}>
                            Retry
                        </Button>
                    </div>
                ) : segments.length === 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>No segments yet</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Create your first segment to start targeting customers.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {segments.map((s, idx) => {
                            const id = segmentId(s);
                            const bg = palette[idx % palette.length];
                            const isActionLoading = actionLoadingId === id;
                            const customers = typeof s.estimatedSize === "number" ? s.estimatedSize : undefined;
                            const pct = customers !== undefined && totalReadySize > 0 ? Math.round((customers / totalReadySize) * 100) : undefined;

                            return (
                                <Card key={id || `${idx}`} className={`${bg} border-none`}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                                                    {(s.status || "").toLowerCase() === "computing" ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    ) : null}
                                                </div>
                                                <CardTitle className="mt-2 text-lg">{s.name}</CardTitle>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <div className="text-4xl font-semibold leading-none">{pct !== undefined ? `${pct}%` : "—%"}</div>
                                            <div className="text-sm text-muted-foreground">{formatNumber(customers)} Customers</div>
                                        </div>

                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div>Last computed: {s.lastComputedAt ? new Date(s.lastComputedAt).toLocaleString() : "—"}</div>
                                            {s.lastError ? <div className="text-destructive">Error: {s.lastError}</div> : null}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(s)} disabled={isActionLoading}>
                                                <Pencil className="h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => onRecompute(s)} disabled={isActionLoading}>
                                                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                                Recompute
                                            </Button>
                                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => onDelete(s)} disabled={isActionLoading}>
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <SegmentEditorDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    segment={editing}
                    onSaved={onSaved}
                />
            </div>
        </div>
    );
}
