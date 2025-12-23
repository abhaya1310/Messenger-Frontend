"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Loader2, Save } from "lucide-react";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
    AdminOrgPosStatusResponse,
    AdminOutlet,
    AdminOutletCreateResponse,
    AdminOutletsListResponse,
} from "@/lib/types/admin-outlets";

type ToastState = { type: "success" | "error"; message: string } | null;

function getOutletId(outlet: AdminOutlet): string {
    return String(outlet._id || outlet.id || outlet.outletId || "");
}

export default function AdminOrgOutletsPage() {
    const params = useParams<{ orgId: string }>();
    const orgId = params.orgId;
    const router = useRouter();

    const [orgName, setOrgName] = useState<string>(orgId);
    const [outlets, setOutlets] = useState<AdminOutlet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [posStatus, setPosStatus] = useState<AdminOrgPosStatusResponse["data"] | null>(null);
    const [posStatusLoading, setPosStatusLoading] = useState(false);
    const [posStatusError, setPosStatusError] = useState<string | null>(null);

    const [createName, setCreateName] = useState("");
    const [createAddress, setCreateAddress] = useState("");
    const [createPosOutletId, setCreatePosOutletId] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    const [draftById, setDraftById] = useState<Record<string, string>>({});
    const [savingById, setSavingById] = useState<Record<string, boolean>>({});
    const [toast, setToast] = useState<ToastState>(null);

    const linkedCount = useMemo(() => {
        return outlets.filter((o) => typeof o.posOutletId === "string" && o.posOutletId.trim().length > 0).length;
    }, [outlets]);

    const showToast = (next: ToastState) => {
        setToast(next);
        if (!next) return;
        window.setTimeout(() => setToast(null), 2500);
    };

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${orgId}/outlets`)}`);
                return;
            }

            const orgRes = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-ORG-ID": orgId,
                },
            });

            const orgJson = (await orgRes.json().catch(() => ({}))) as any;
            if (orgRes.ok) {
                setOrgName(String(orgJson?.data?.orgName || orgId));
            }

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/outlets`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}/outlets`)}`);
                    return;
                }
                setError(data?.error || data?.message || "Failed to fetch outlets");
                setOutlets([]);
                return;
            }

            const parsed = data as AdminOutletsListResponse;
            const nextOutlets = Array.isArray(parsed?.data) ? parsed.data : [];
            setOutlets(nextOutlets);

            const nextDraft: Record<string, string> = {};
            for (const o of nextOutlets) {
                const id = getOutletId(o);
                if (!id) continue;
                nextDraft[id] = typeof o.posOutletId === "string" ? o.posOutletId : "";
            }
            setDraftById(nextDraft);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch outlets");
            setOutlets([]);
        } finally {
            setLoading(false);
        }
    };

    const loadPosStatus = async () => {
        setPosStatusLoading(true);
        setPosStatusError(null);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/pos/status`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}/outlets`)}`);
                    return;
                }
                setPosStatusError(data?.error || data?.message || "Failed to fetch POS status");
                setPosStatus(null);
                return;
            }

            const parsed = data as AdminOrgPosStatusResponse;
            setPosStatus(parsed?.data || null);
        } catch (e) {
            setPosStatusError(e instanceof Error ? e.message : "Failed to fetch POS status");
            setPosStatus(null);
        } finally {
            setPosStatusLoading(false);
        }
    };

    useEffect(() => {
        load();
        loadPosStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    const createOutlet = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const name = createName.trim();
        const address = createAddress.trim();
        const posOutletId = createPosOutletId.trim();

        if (!name) {
            showToast({ type: "error", message: "Outlet name is required" });
            return;
        }

        setCreateLoading(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const body: Record<string, unknown> = { name };
            if (address) body.address = address;
            if (posOutletId) body.posOutletId = posOutletId;

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/outlets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                const code = data?.error;
                if (code === "pos_outlet_id_in_use") {
                    showToast({ type: "error", message: "This POS outlet ID is already mapped to another outlet in this organisation." });
                    return;
                }
                showToast({ type: "error", message: data?.error || data?.message || "Failed to create outlet" });
                return;
            }

            const parsed = data as AdminOutletCreateResponse;
            const created = parsed?.data as AdminOutlet | undefined;
            if (created) {
                setOutlets((prev) => [created, ...prev]);
                const createdId = getOutletId(created);
                if (createdId) {
                    setDraftById((prev) => ({ ...prev, [createdId]: typeof created.posOutletId === "string" ? created.posOutletId : "" }));
                }
            } else {
                await load();
            }

            setCreateName("");
            setCreateAddress("");
            setCreatePosOutletId("");
            showToast({ type: "success", message: "Outlet created" });
            loadPosStatus();
        } catch (e2) {
            showToast({ type: "error", message: e2 instanceof Error ? e2.message : "Failed to create outlet" });
        } finally {
            setCreateLoading(false);
        }
    };

    const saveOutlet = async (outlet: AdminOutlet) => {
        const outletId = getOutletId(outlet);
        if (!outletId) {
            showToast({ type: "error", message: "Invalid outlet id" });
            return;
        }

        const raw = String(draftById[outletId] ?? "");
        const trimmed = raw.trim();

        if (!trimmed) {
            showToast({ type: "error", message: "POS Outlet ID must be a non-empty string" });
            return;
        }

        setSavingById((p) => ({ ...p, [outletId]: true }));
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/outlets/${encodeURIComponent(outletId)}/pos`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ posOutletId: trimmed }),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                const code = data?.error;
                if (code === "pos_outlet_id_in_use") {
                    showToast({ type: "error", message: "This POS outlet ID is already mapped to another outlet in this organisation." });
                    return;
                }
                if (code === "not_found") {
                    showToast({ type: "error", message: "Outlet not found (or does not belong to this organisation)." });
                    return;
                }
                showToast({ type: "error", message: data?.error || data?.message || "Failed to save" });
                return;
            }

            const nextValue = trimmed ? trimmed : "";
            setOutlets((prev) => prev.map((o) => (getOutletId(o) === outletId ? { ...o, posOutletId: nextValue } : o)));
            setDraftById((prev) => ({ ...prev, [outletId]: nextValue }));
            showToast({ type: "success", message: "POS Outlet ID saved" });
            loadPosStatus();
        } catch (e) {
            showToast({ type: "error", message: e instanceof Error ? e.message : "Failed to save" });
        } finally {
            setSavingById((p) => ({ ...p, [outletId]: false }));
        }
    };

    const clearOutletPosId = async (outlet: AdminOutlet) => {
        const outletId = getOutletId(outlet);
        if (!outletId) {
            showToast({ type: "error", message: "Invalid outlet id" });
            return;
        }

        setSavingById((p) => ({ ...p, [outletId]: true }));
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/outlets/${encodeURIComponent(outletId)}/pos`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ posOutletId: null }),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                const code = data?.error;
                if (code === "not_found") {
                    showToast({ type: "error", message: "Outlet not found (or does not belong to this organisation)." });
                    return;
                }
                showToast({ type: "error", message: data?.error || data?.message || "Failed to clear" });
                return;
            }

            setOutlets((prev) => prev.map((o) => (getOutletId(o) === outletId ? { ...o, posOutletId: "" } : o)));
            setDraftById((prev) => ({ ...prev, [outletId]: "" }));
            showToast({ type: "success", message: "POS Outlet ID cleared" });
            loadPosStatus();
        } catch (e) {
            showToast({ type: "error", message: e instanceof Error ? e.message : "Failed to clear" });
        } finally {
            setSavingById((p) => ({ ...p, [outletId]: false }));
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Outlets</h1>
                        <p className="text-sm text-muted-foreground">Org: {orgName} ({orgId})</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/admin/orgs/${encodeURIComponent(orgId)}`}>Back to Org</Link>
                        </Button>
                        <Button variant="outline" onClick={load} disabled={loading}>
                            Refresh
                        </Button>
                        <Button variant="outline" onClick={loadPosStatus} disabled={posStatusLoading}>
                            POS Status
                        </Button>
                    </div>
                </div>

                {toast && (
                    <div
                        className={
                            "fixed bottom-4 right-4 z-50 rounded-md border px-4 py-3 shadow-lg text-sm " +
                            (toast.type === "success" ? "bg-green-50 border-green-200 text-green-900" : "bg-red-50 border-red-200 text-red-900")
                        }
                        role="status"
                    >
                        {toast.message}
                    </div>
                )}

                {error && (
                    <p className="text-sm text-destructive" role="alert">
                        {error}
                    </p>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Outlet POS Mapping</CardTitle>
                        <Badge variant="outline">
                            {linkedCount} of {outlets.length} outlets linked to POS
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-6">
                            Save the ConnectNow OutletId for each outlet. This must exactly match the `outletId` field in ConnectNow bills.
                        </p>

                        <form onSubmit={createOutlet} className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
                            <div className="space-y-2">
                                <Label htmlFor="createName">Name *</Label>
                                <Input id="createName" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Outlet Name" disabled={createLoading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="createAddress">Address</Label>
                                <Input id="createAddress" value={createAddress} onChange={(e) => setCreateAddress(e.target.value)} placeholder="Optional address" disabled={createLoading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="createPosOutletId">POS Outlet ID</Label>
                                <Input id="createPosOutletId" value={createPosOutletId} onChange={(e) => setCreatePosOutletId(e.target.value)} placeholder="MerchantID001" disabled={createLoading} />
                            </div>
                            <div className="flex items-end justify-end">
                                <Button type="submit" disabled={createLoading} className="gap-2">
                                    {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Create Outlet
                                </Button>
                            </div>
                        </form>

                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                            </div>
                        ) : outlets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No outlets found.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Outlet</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead className="w-[420px]">POS Outlet ID</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {outlets.map((o) => {
                                        const id = getOutletId(o);
                                        const saved = typeof o.posOutletId === "string" ? o.posOutletId : "";
                                        const draft = draftById[id] ?? "";
                                        const isSaving = Boolean(savingById[id]);
                                        const linked = saved.trim().length > 0;
                                        const canSave = !isSaving && draft.trim().length > 0 && draft.trim() !== saved.trim();
                                        const canClear = !isSaving && saved.trim().length > 0;

                                        return (
                                            <TableRow key={id || Math.random()}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {linked ? (
                                                            <>
                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                                <span className="text-sm">POS Linked</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                                <span className="text-sm">Not Linked</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">{o.name || o.displayName || id}</div>
                                                        <div className="text-xs text-muted-foreground">Outlet ID: {id || "—"}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{o.address || ""}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-2">
                                                        <Label>POS Outlet ID</Label>
                                                        <Input
                                                            value={draft}
                                                            onChange={(e) => setDraftById((p) => ({ ...p, [id]: e.target.value }))}
                                                            placeholder="MerchantID001"
                                                            disabled={isSaving}
                                                        />
                                                        <p className="text-xs text-muted-foreground">Enter the outlet ID as sent by your POS in order payloads</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => saveOutlet(o)}
                                                            disabled={!canSave}
                                                            className="gap-2"
                                                        >
                                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => clearOutletPosId(o)}
                                                            disabled={!canClear}
                                                        >
                                                            Clear
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>POS Status / Diagnostics</CardTitle>
                        <Badge variant="outline" className="capitalize">{posStatus?.status || "—"}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {posStatusLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                            </div>
                        ) : posStatusError ? (
                            <p className="text-sm text-destructive" role="alert">
                                {posStatusError}
                            </p>
                        ) : !posStatus ? (
                            <p className="text-sm text-muted-foreground">No POS status data.</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">Merchant ID</div>
                                        <div className="font-medium">{posStatus.merchantId || orgId}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Restaurant ID</div>
                                        <div className="font-medium">{posStatus.restaurantId || "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Last ingested</div>
                                        <div className="font-medium">{posStatus.lastIngestedAt ? new Date(posStatus.lastIngestedAt).toLocaleString() : "—"}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">Mapped outlets</div>
                                        <div className="font-medium">{String(posStatus.mappedOutlets?.length ?? 0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Unmapped outlets</div>
                                        <div className="font-medium">{String(posStatus.unmappedOutletsCount ?? "—")}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium mb-2">Mapped outlets</div>
                                    {posStatus.mappedOutlets?.length ? (
                                        <div className="space-y-1 text-sm">
                                            {posStatus.mappedOutlets.map((m) => (
                                                <div key={m._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                                                    <div className="font-medium">{m.name}</div>
                                                    <div className="text-muted-foreground">{m.posOutletId}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No mapped outlets.</p>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    ConnectNow OutletId must match the Outlet ID you saved for each outlet.
                                </p>

                                <div>
                                    <div className="text-sm font-medium mb-2">Container consumer metrics</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <div className="text-muted-foreground">lastRunAt</div>
                                            <div className="font-medium">{posStatus.container?.lastRunAt ? new Date(posStatus.container.lastRunAt).toLocaleString() : "—"}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">lastFetchAt</div>
                                            <div className="font-medium">{posStatus.container?.lastFetchAt ? new Date(posStatus.container.lastFetchAt).toLocaleString() : "—"}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">lastFetchedCount</div>
                                            <div className="font-medium">{String(posStatus.container?.lastFetchedCount ?? "—")}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">lastIngestedCount</div>
                                            <div className="font-medium">{String(posStatus.container?.lastIngestedCount ?? "—")}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">lastDuplicateCount</div>
                                            <div className="font-medium">{String(posStatus.container?.lastDuplicateCount ?? "—")}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">lastRejectedCount</div>
                                            <div className="font-medium">{String(posStatus.container?.lastRejectedCount ?? "—")}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">lastAckedCount</div>
                                            <div className="font-medium">{String(posStatus.container?.lastAckedCount ?? "—")}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">lastDeleteFailedCount</div>
                                            <div className="font-medium">{String(posStatus.container?.lastDeleteFailedCount ?? "—")}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium mb-2">Poison tracking</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <div className="text-muted-foreground">pendingCount</div>
                                            <div className="font-medium">{String(posStatus.poison?.pendingCount ?? "—")}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">rejectedCount</div>
                                            <div className="font-medium">{String(posStatus.poison?.rejectedCount ?? "—")}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">lastError</div>
                                            <div className="font-medium">{posStatus.poison?.lastError?.error || "—"}</div>
                                        </div>
                                    </div>
                                    {posStatus.poison?.lastError ? (
                                        <div className="rounded-md border p-3 text-sm space-y-1 mt-3">
                                            <div><span className="text-muted-foreground">transactionId:</span> {posStatus.poison.lastError.transactionId || "—"}</div>
                                            <div><span className="text-muted-foreground">outletId:</span> {posStatus.poison.lastError.outletId || "—"}</div>
                                            <div><span className="text-muted-foreground">attempts:</span> {String(posStatus.poison.lastError.attempts ?? "—")}</div>
                                        </div>
                                    ) : null}
                                </div>

                                {posStatus.error ? (
                                    <div className="rounded-md border p-3 text-sm">
                                        <div className="text-muted-foreground">Last error</div>
                                        <div className="font-medium">{posStatus.error}</div>
                                    </div>
                                ) : null}

                                <div>
                                    <div className="text-sm font-medium mb-2">Last rejected order</div>
                                    {posStatus.lastRejectedOrder ? (
                                        <div className="rounded-md border p-3 text-sm space-y-1">
                                            <div><span className="text-muted-foreground">At:</span> {posStatus.lastRejectedOrder.at ? new Date(posStatus.lastRejectedOrder.at).toLocaleString() : "—"}</div>
                                            <div><span className="text-muted-foreground">Reason:</span> {posStatus.lastRejectedOrder.reason || "—"}</div>
                                            <div><span className="text-muted-foreground">outletId:</span> {posStatus.lastRejectedOrder.outletId || "—"}</div>
                                            <div><span className="text-muted-foreground">transactionId:</span> {posStatus.lastRejectedOrder.transactionId || "—"}</div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">None</p>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
