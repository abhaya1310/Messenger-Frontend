"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAuthToken, getCurrentOrgId } from "@/lib/auth";
import type { Order, OrdersListResponse } from "@/lib/types/order";

function getOrderId(o: Order, index: number): string {
    return String(o.id || o._id || o.transactionId || index);
}

function formatDateTime(value?: string): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

function formatAmount(value?: number): string {
    if (typeof value !== "number" || Number.isNaN(value)) return "—";
    try {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
    } catch {
        return String(value);
    }
}

function statusBadgeVariant(status?: string): "success" | "warning" | "destructive" | "outline" {
    const s = (status || "").toLowerCase();
    if (s === "ingested") return "success";
    if (s === "duplicate") return "warning";
    if (s === "rejected") return "destructive";
    return "outline";
}

function statusLabel(status?: string): string {
    const s = (status || "").toLowerCase();
    if (s === "ingested") return "Ingested";
    if (s === "duplicate") return "Duplicate";
    if (s === "rejected") return "Rejected";
    return status || "—";
}

export default function OrdersPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);

    const rows = useMemo(() => {
        if (!Array.isArray(orders)) return [];
        return orders;
    }, [orders]);

    const loadOrders = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error("Unauthorized");
            }

            const orgId = getCurrentOrgId();

            const res = await fetch("/api/orders", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(orgId ? { "X-ORG-ID": orgId } : {}),
                },
            });

            const json = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                setOrders([]);
                setError(json?.error || json?.message || "Failed to load orders. Please try again.");
                return;
            }

            const parsed = json as OrdersListResponse;
            const list = (Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed?.orders) ? parsed.orders : []) as Order[];

            setOrders(list);
        } catch (e) {
            setOrders([]);
            setError(e instanceof Error ? e.message : "Failed to load orders. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const onFetchLatest = async () => {
        setRefreshLoading(true);
        setRefreshMessage(null);
        setRefreshError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error("Unauthorized");
            }

            const orgId = getCurrentOrgId();

            const res = await fetch("/api/orders/refresh", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(orgId ? { "X-ORG-ID": orgId } : {}),
                },
            });

            const json = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                setRefreshError(json?.error || json?.message || "Failed to fetch latest orders. Please try again.");
                return;
            }

            const parts: string[] = [];
            const maybeNumber = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
            const integrations = maybeNumber(json?.integrations);
            const fetched = maybeNumber(json?.fetched);
            const ingested = maybeNumber(json?.ingested);
            const rejected = maybeNumber(json?.rejected);
            const acked = maybeNumber(json?.acked);
            const deleteFailed = maybeNumber(json?.deleteFailed);
            if (integrations !== undefined) parts.push(`integrations=${integrations}`);
            if (fetched !== undefined) parts.push(`fetched=${fetched}`);
            if (ingested !== undefined) parts.push(`ingested=${ingested}`);
            if (rejected !== undefined) parts.push(`rejected=${rejected}`);
            if (acked !== undefined) parts.push(`acked=${acked}`);
            if (deleteFailed !== undefined) parts.push(`deleteFailed=${deleteFailed}`);

            setRefreshMessage(parts.length ? `Triggered fetch latest (${parts.join(", ")}).` : "Triggered fetch latest.");
            await loadOrders();
        } catch (e) {
            setRefreshError(e instanceof Error ? e.message : "Failed to fetch latest orders. Please try again.");
        } finally {
            setRefreshLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Orders</h1>
                        <p className="text-sm text-muted-foreground">Recent bills received from POS (latest first)</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onFetchLatest} disabled={loading || refreshLoading} className="gap-2">
                            {refreshLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            Fetch Latest
                        </Button>
                        <Button variant="outline" onClick={loadOrders} disabled={loading} className="gap-2">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            Refresh
                        </Button>
                    </div>
                </div>

                {refreshMessage ? <p className="text-sm text-muted-foreground">{refreshMessage}</p> : null}
                {refreshError ? (
                    <p className="text-sm text-destructive" role="alert">
                        {refreshError}
                    </p>
                ) : null}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Latest 50</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading orders…
                                </div>
                            </div>
                        ) : error ? (
                            <div className="space-y-3">
                                <p className="text-sm text-destructive" role="alert">
                                    {error || "Failed to load orders. Please try again."}
                                </p>
                                <Button variant="outline" onClick={loadOrders} disabled={loading}>
                                    Retry
                                </Button>
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-sm text-muted-foreground">No orders found.</p>
                                <p className="text-sm text-muted-foreground">Waiting for POS bills to arrive.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date / Time</TableHead>
                                        <TableHead>Transaction ID</TableHead>
                                        <TableHead>Outlet</TableHead>
                                        <TableHead>Guest</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((o, index) => {
                                        const id = getOrderId(o, index);
                                        const outletName = o.outlet?.name || o.outlet?.id || "Unknown Outlet";
                                        const outletPosId = o.outlet?.posOutletId;
                                        const guestName = o.guest?.name;
                                        const guestPhone = o.guest?.phone;

                                        return (
                                            <TableRow key={id}>
                                                <TableCell className="whitespace-nowrap">{formatDateTime(o.createdAt)}</TableCell>
                                                <TableCell className="font-mono text-xs">{o.transactionId || "—"}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">{outletName}</div>
                                                        <div className="text-xs text-muted-foreground">POS: {outletPosId || "—"}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">{guestName || "Anonymous"}</div>
                                                        <div className="text-xs text-muted-foreground">{guestPhone || "—"}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{formatAmount(o.totalAmount)}</TableCell>
                                                <TableCell>{o.paymentMethod || "—"}</TableCell>
                                                <TableCell>
                                                    <Badge variant={statusBadgeVariant(o.status)}>{statusLabel(o.status)}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
