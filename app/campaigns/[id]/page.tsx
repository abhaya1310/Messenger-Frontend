"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { clearAuth, getAuthToken } from "@/lib/auth";
import type { Campaign } from "@/lib/types/campaign";

async function parseJsonSafe(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

function statusBadgeVariant(status: Campaign["status"]) {
    switch (status) {
        case "preparing":
            return "warning" as const;
        case "scheduled":
            return "outline" as const;
        case "waiting_for_credits":
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
        case "waiting_for_credits":
            return <Clock className="h-4 w-4" />;
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

export default function CampaignDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const pollingRef = useRef<number | null>(null);

    const stopPolling = () => {
        if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const load = async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                setError("Your session has expired. Please log in again.");
                setCampaign(null);
                return;
            }

            const headers: Record<string, string> = {
                Authorization: `Bearer ${token}`,
            };

            const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
                method: "GET",
                headers,
            });

            if (res.status === 401) {
                clearAuth();
                setCampaign(null);
                setError("Your session has expired. Please log in again.");
                window.location.assign("/login?reason=session_expired");
                return;
            }

            const json = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (json as any)?.error || (json as any)?.message || "Failed to load campaign";
                throw new Error(msg);
            }

            const data = ((json as any)?.data || json) as Campaign;
            setCampaign(data);

            if (data?.status === "preparing" || data?.status === "scheduled" || data?.status === "waiting_for_credits") {
                if (!pollingRef.current) {
                    pollingRef.current = window.setInterval(() => load({ silent: true }), 7000);
                }
                return;
            }

            if (data?.status === "active") {
                if (!pollingRef.current) {
                    pollingRef.current = window.setInterval(() => load({ silent: true }), 15000);
                }
                return;
            }

            stopPolling();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load campaign");
            setCampaign(null);
        } finally {
            if (!opts?.silent) setLoading(false);
        }
    };

    useEffect(() => {
        load();
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const est = (campaign as any)?.audience?.estimatedCount;
    const target = (campaign as any)?.metrics?.targetCount;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-start justify-between gap-4 py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Campaign</h1>
                            <p className="text-gray-600 mt-1">{id}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/campaigns">Back</Link>
                            </Button>
                            <Button variant="outline" onClick={() => load()} disabled={loading} className="gap-2">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <Breadcrumb items={[{ label: "Campaigns", href: "/campaigns" }, { label: "Detail" }]} />

                {error && (
                    <Card className="border-destructive/30">
                        <CardContent className="pt-6">
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="min-w-0">
                            <CardTitle className="truncate">{campaign?.name || "—"}</CardTitle>
                        </div>
                        {campaign?.status ? (
                            <Badge variant={statusBadgeVariant(campaign.status)} className="capitalize">
                                <span className="flex items-center gap-1">
                                    {statusIcon(campaign.status)}
                                    <span>{campaign.status}</span>
                                </span>
                            </Badge>
                        ) : null}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading && !campaign ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : !campaign ? (
                            <p className="text-sm text-muted-foreground">No campaign data.</p>
                        ) : (
                            <>
                                {campaign.status === "preparing" ? (
                                    <div className="rounded-md border p-3">
                                        <div className="text-sm font-medium">Preparing audience…</div>
                                        <div className="text-sm text-muted-foreground">This may take a moment depending on audience size.</div>
                                    </div>
                                ) : null}

                                {campaign.status === "waiting_for_credits" ? (
                                    <div className="rounded-md border p-3">
                                        <div className="text-sm font-medium">Waiting for credits…</div>
                                        <div className="text-sm text-muted-foreground">Please top up credits to start this campaign.</div>
                                    </div>
                                ) : null}

                                {campaign.status === "failed" ? (
                                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                                        <div className="text-sm font-medium">Failed</div>
                                        <div className="text-sm text-muted-foreground">The audience job failed. Please review filters and try again.</div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">Scheduled At</div>
                                        <div className="font-medium">{campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Template</div>
                                        <div className="font-medium break-all">{campaign.template?.name || "—"}</div>
                                        <div className="text-xs text-muted-foreground">{campaign.template?.language || ""}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Audience Type</div>
                                        <div className="font-medium">{campaign.audience?.type || "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Reach</div>
                                        {campaign.status === "preparing" ? (
                                            <div className="text-muted-foreground">Calculating…</div>
                                        ) : (
                                            <div className="font-medium">
                                                Estimated: {typeof est === "number" ? est.toLocaleString() : "—"}
                                                <br />
                                                Target: {typeof target === "number" ? target.toLocaleString() : "—"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
