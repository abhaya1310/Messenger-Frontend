"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { AdminOutlet } from "@/lib/types/admin-outlets";

type ToastState = { type: "success" | "error"; message: string } | null;

type OrgDetailsResponse = {
    success: boolean;
    data: any;
};

function extractOutlets(orgData: any): AdminOutlet[] {
    const candidates = [
        orgData?.outlets,
        orgData?.locations,
        orgData?.stores,
        orgData?.branches,
        orgData?.pos?.outlets,
        orgData?.posIntegration?.outlets,
        orgData?.services?.posIntegration?.outlets,
    ];

    for (const c of candidates) {
        if (Array.isArray(c)) return c as AdminOutlet[];
    }

    return [];
}

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

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-ORG-ID": orgId,
                },
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}/outlets`)}`);
                    return;
                }
                setError(data?.error || data?.message || "Failed to fetch org");
                setOutlets([]);
                return;
            }

            const parsed = data as OrgDetailsResponse;
            const orgData = parsed?.data;
            setOrgName(String(orgData?.orgName || orgId));

            const nextOutlets = extractOutlets(orgData);
            setOutlets(nextOutlets);

            const nextDraft: Record<string, string> = {};
            for (const o of nextOutlets) {
                const id = getOutletId(o);
                if (!id) continue;
                nextDraft[id] = typeof o.posOutletId === "string" ? o.posOutletId : "";
            }
            setDraftById(nextDraft);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch org");
            setOutlets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

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
                showToast({ type: "error", message: data?.error || data?.message || "Failed to save" });
                return;
            }

            setOutlets((prev) => prev.map((o) => (getOutletId(o) === outletId ? { ...o, posOutletId: trimmed } : o)));
            setDraftById((prev) => ({ ...prev, [outletId]: trimmed }));
            showToast({ type: "success", message: "POS Outlet ID saved" });
        } catch (e) {
            showToast({ type: "error", message: e instanceof Error ? e.message : "Failed to save" });
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
                        <CardTitle>Outlet POS Linkage</CardTitle>
                        <Badge variant="outline">
                            {linkedCount} of {outlets.length} outlets linked to POS
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                            </div>
                        ) : outlets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No outlets found in the org payload. If the backend uses a different field name, we can map it.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Outlet</TableHead>
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
                                                        <div className="font-medium">{o.displayName || o.name || id}</div>
                                                        <div className="text-xs text-muted-foreground">Outlet ID: {id || "—"}</div>
                                                    </div>
                                                </TableCell>
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
                                                    <Button
                                                        size="sm"
                                                        onClick={() => saveOutlet(o)}
                                                        disabled={!canSave}
                                                        className="gap-2"
                                                    >
                                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                        Save
                                                    </Button>
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
