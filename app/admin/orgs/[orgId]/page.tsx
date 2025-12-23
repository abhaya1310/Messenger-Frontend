"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { setSelectedOrgId } from "@/lib/selected-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AdminOrgPosStatusResponse } from "@/lib/types/admin-outlets";

type OrgDetailsResponse = {
    success: boolean;
    data: {
        orgId: string;
        orgName: string;
        timezone?: string;
        services?: Record<string, unknown>;
        features?: Record<string, unknown>;
        abuseDetection?: {
            enabled?: boolean;
            maxOrdersPerDayPerPhone?: number;
        };
        whatsapp?: {
            isConfigured?: boolean;
            model?: string;
            phoneNumberId?: string;
            displayPhoneNumber?: string;
            displayName?: string;
            tokenStatus?: string;
            dedicated?: unknown;
        };
    };
};

export default function AdminOrgDetailsPage() {
    const params = useParams<{ orgId: string }>();
    const orgId = params.orgId;
    const router = useRouter();

    const [org, setOrg] = useState<OrgDetailsResponse["data"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [phoneNumberId, setPhoneNumberId] = useState("");
    const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveOk, setSaveOk] = useState<string | null>(null);

    const [abuseEnabled, setAbuseEnabled] = useState(false);
    const [abuseMaxOrdersPerDay, setAbuseMaxOrdersPerDay] = useState<string>("");
    const [abuseSaving, setAbuseSaving] = useState(false);
    const [abuseError, setAbuseError] = useState<string | null>(null);
    const [abuseOk, setAbuseOk] = useState<string | null>(null);

    const [accessEmail, setAccessEmail] = useState("");
    const [generatingAccessCode, setGeneratingAccessCode] = useState(false);
    const [accessError, setAccessError] = useState<string | null>(null);
    const [accessResult, setAccessResult] = useState<{ accessCode: string; expiresAt?: string; email?: string } | null>(null);

    const [posRestaurantId, setPosRestaurantId] = useState("");
    const [posConnectNowMerchantId, setPosConnectNowMerchantId] = useState("");
    const [posShowAdvanced, setPosShowAdvanced] = useState(false);
    const [posSaving, setPosSaving] = useState(false);
    const [posError, setPosError] = useState<string | null>(null);
    const [posOk, setPosOk] = useState<string | null>(null);

    const [posStatus, setPosStatus] = useState<AdminOrgPosStatusResponse["data"] | null>(null);
    const [posStatusLoading, setPosStatusLoading] = useState(false);
    const [posStatusError, setPosStatusError] = useState<string | null>(null);

    const [posSyncLoading, setPosSyncLoading] = useState(false);
    const [posSyncError, setPosSyncError] = useState<string | null>(null);
    const [posSyncOk, setPosSyncOk] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                return;
            }

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}`, {
                headers: { Authorization: `Bearer ${token}`, "X-ORG-ID": orgId },
            });
            const data = (await res.json().catch(() => ({}))) as any;

            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                    return;
                }
                if (res.status === 403) {
                    setError("Admin access required");
                    setOrg(null);
                    return;
                }
                setError(data?.error || "Failed to fetch org");
                setOrg(null);
                return;
            }

            const parsed = data as OrgDetailsResponse;
            setOrg(parsed.data);

            setPhoneNumberId(parsed.data?.whatsapp?.phoneNumberId || "");
            setDisplayPhoneNumber(parsed.data?.whatsapp?.displayPhoneNumber || "");
            setDisplayName(parsed.data?.whatsapp?.displayName || "");

            setAbuseEnabled(Boolean(parsed.data?.abuseDetection?.enabled));
            setAbuseMaxOrdersPerDay(
                typeof parsed.data?.abuseDetection?.maxOrdersPerDayPerPhone === "number"
                    ? String(parsed.data.abuseDetection.maxOrdersPerDayPerPhone)
                    : ""
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch org");
            setOrg(null);
        } finally {
            setLoading(false);
        }
    };

    const loadPosStatus = async () => {
        setPosStatusLoading(true);
        setPosStatusError(null);
        try {
            const token = getAuthToken();
            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/pos/status`, {
                method: "GET",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                    return;
                }
                setPosStatusError(data?.error || data?.message || "Failed to fetch POS status");
                setPosStatus(null);
                return;
            }

            const parsed = data as AdminOrgPosStatusResponse;
            setPosStatus(parsed?.data || null);
            setPosRestaurantId(typeof parsed?.data?.restaurantId === "string" ? parsed.data.restaurantId : "");
            setPosConnectNowMerchantId(
                typeof parsed?.data?.connectNowMerchantId === "string" ? parsed.data.connectNowMerchantId : ""
            );
        } catch (e) {
            setPosStatusError(e instanceof Error ? e.message : "Failed to fetch POS status");
            setPosStatus(null);
        } finally {
            setPosStatusLoading(false);
        }
    };

    const onSaveAbuseDetection = async (e: FormEvent) => {
        e.preventDefault();
        setAbuseError(null);
        setAbuseOk(null);
        setAbuseSaving(true);

        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                return;
            }

            const maxOrdersRaw = abuseMaxOrdersPerDay.trim();
            const maxOrders = maxOrdersRaw ? Number(maxOrdersRaw) : undefined;
            if (maxOrdersRaw && (!Number.isFinite(maxOrders) || (maxOrders as number) <= 0 || !Number.isInteger(maxOrders))) {
                setAbuseError("maxOrdersPerDayPerPhone must be a positive integer");
                return;
            }

            const payload: Record<string, unknown> = {
                enabled: abuseEnabled,
            };
            if (typeof maxOrders === "number") {
                payload.maxOrdersPerDayPerPhone = maxOrders;
            }

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/abuse-detection`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                    return;
                }
                if (res.status === 403) {
                    setAbuseError("Admin access required");
                    return;
                }
                setAbuseError(data?.error || data?.message || "Failed to update abuse detection");
                return;
            }

            setAbuseOk("Abuse detection updated");
            await load();
        } catch (err) {
            setAbuseError(err instanceof Error ? err.message : "Failed to update abuse detection");
        } finally {
            setAbuseSaving(false);
        }
    };

    const onGenerateAccessCode = async (e: FormEvent) => {
        e.preventDefault();
        setAccessError(null);
        setAccessResult(null);
        setGeneratingAccessCode(true);

        try {
            const token = getAuthToken();
            if (!token) {
                setAccessError("Not authenticated. Please login again.");
                return;
            }

            const email = accessEmail.trim();
            if (!email) {
                setAccessError("Email is required");
                return;
            }

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/user`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email }),
            });

            const text = await res.text();
            let data: any = undefined;
            try {
                data = text ? JSON.parse(text) : undefined;
            } catch {
                data = text;
            }

            if (!res.ok) {
                const backendErrorCode =
                    typeof data === "string"
                        ? undefined
                        : typeof data?.error === "string"
                            ? data.error
                            : undefined;

                const backendMessage =
                    typeof data === "string"
                        ? data
                        : typeof data?.message === "string"
                            ? data.message
                            : undefined;

                if (res.status === 401) {
                    setAccessError("Session expired (401). Please login again.");
                    return;
                }
                if (res.status === 403) {
                    setAccessError("Forbidden (403): admin access required.");
                    return;
                }
                if (res.status === 409 && backendErrorCode === "email_in_use") {
                    setAccessError("Email already in use");
                    return;
                }
                if (res.status === 409 && backendErrorCode === "org_user_exists") {
                    setAccessError("Org user already exists; use reset/reissue");
                    return;
                }
                if (res.status === 500 && backendErrorCode === "registration_code_pepper_not_configured") {
                    setAccessError("Server config missing; contact backend team");
                    return;
                }

                setAccessError(
                    `Failed to generate access code (${res.status}${res.statusText ? ` ${res.statusText}` : ""})` +
                    (backendErrorCode ? `: ${backendErrorCode}` : backendMessage ? `: ${backendMessage}` : "")
                );
                return;
            }

            const payload = (data as any)?.data;
            const accessCode = payload?.accessCode;
            if (typeof accessCode !== "string" || !accessCode) {
                setAccessError("Access code was not returned by server");
                return;
            }

            setAccessResult({
                accessCode,
                expiresAt: typeof payload?.expiresAt === "string" ? payload.expiresAt : undefined,
                email: typeof payload?.email === "string" ? payload.email : email,
            });
        } catch (err) {
            setAccessError(err instanceof Error ? `Network error: ${err.message}` : "Network error");
        } finally {
            setGeneratingAccessCode(false);
        }
    };

    const expiresAtLabel = accessResult?.expiresAt
        ? (() => {
            const date = new Date(accessResult.expiresAt);
            if (Number.isNaN(date.getTime())) return accessResult.expiresAt;
            return date.toLocaleString();
        })()
        : null;

    useEffect(() => {
        setSelectedOrgId(orgId);
        load();
        loadPosStatus();
    }, [orgId]);

    const onSavePosConfigure = async (e: FormEvent) => {
        e.preventDefault();
        setPosOk(null);
        setPosError(null);

        const restaurantId = posRestaurantId.trim();
        const connectNowMerchantIdTrimmed = posConnectNowMerchantId.trim();
        if (!restaurantId) {
            setPosError("Restaurant ID is required");
            return;
        }

        setPosSaving(true);
        try {
            const token = getAuthToken();

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/pos/configure`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    restaurantId,
                    ...(connectNowMerchantIdTrimmed ? { connectNowMerchantId: connectNowMerchantIdTrimmed } : {}),
                }),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                    return;
                }
                if (res.status === 403) {
                    setPosError("Admin access required");
                    return;
                }
                setPosError(data?.error || data?.message || "Failed to configure POS");
                return;
            }

            const configuredRestaurantId = (data as any)?.data?.restaurantId;
            if (typeof configuredRestaurantId === "string") {
                setPosRestaurantId(configuredRestaurantId);
            }
            const configuredConnectNowMerchantId = (data as any)?.data?.connectNowMerchantId;
            if (typeof configuredConnectNowMerchantId === "string") {
                setPosConnectNowMerchantId(configuredConnectNowMerchantId);
            }

            setPosOk("POS configuration saved");
            await loadPosStatus();
        } catch (err) {
            setPosError(err instanceof Error ? err.message : "Failed to configure POS");
        } finally {
            setPosSaving(false);
        }
    };

    const onSyncNow = async () => {
        setPosSyncOk(null);
        setPosSyncError(null);
        setPosSyncLoading(true);

        try {
            const token = getAuthToken();

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/pos/sync`, {
                method: "POST",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                    return;
                }
                setPosSyncError(data?.error || data?.message || "Failed to sync");
                return;
            }

            setPosSyncOk("Sync triggered");
            await loadPosStatus();
        } catch (err) {
            setPosSyncError(err instanceof Error ? err.message : "Failed to sync");
        } finally {
            setPosSyncLoading(false);
        }
    };

    const onUpdatePhone = async (e: FormEvent) => {
        e.preventDefault();
        setSaveOk(null);
        setSaveError(null);
        setSaving(true);

        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                return;
            }

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/whatsapp/update-phone-number-id`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-ORG-ID": orgId,
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ phoneNumberId, displayPhoneNumber, displayName }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
                    return;
                }
                if (res.status === 403) {
                    setSaveError("Admin access required");
                    return;
                }
                if (res.status === 409 && (data as any)?.error === 'phone_number_id_in_use') {
                    const otherOrgId = (data as any)?.orgId;
                    setSaveError(
                        typeof otherOrgId === 'string' && otherOrgId
                            ? `phoneNumberId is already in use by orgId: ${otherOrgId}`
                            : 'phoneNumberId is already in use by another org'
                    );
                    return;
                }
                if ((data as any)?.error === 'WhatsAppNotConfigured') {
                    setSaveError('WhatsApp is not configured for this org');
                    return;
                }
                setSaveError((data as any)?.error || "Failed to update phone number id");
                return;
            }

            setSaveOk("Phone number ID updated");
            await load();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to update phone number id");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Org: {orgId}</h1>
                        <p className="text-sm text-muted-foreground">Manage WhatsApp configuration and status.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/admin/orgs">All orgs</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/admin/orgs/${encodeURIComponent(orgId)}/outlets`}>Outlets</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/admin/orgs/${encodeURIComponent(orgId)}/credits`}>Credits</Link>
                        </Button>
                    </div>
                </div>

                {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
                {error && (
                    <p className="text-sm text-destructive" role="alert">
                        {error}
                    </p>
                )}

                {org && (
                    <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>POS Configuration (ConnectNow)</CardTitle>
                                <Button variant="outline" onClick={loadPosStatus} disabled={posStatusLoading}>
                                    {posStatusLoading ? "Refreshing..." : "Refresh"}
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form onSubmit={onSavePosConfigure} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="restaurantId">Restaurant ID</Label>
                                        <Input
                                            id="restaurantId"
                                            value={posRestaurantId}
                                            onChange={(e) => setPosRestaurantId(e.target.value)}
                                            placeholder="220006"
                                            disabled={posSaving}
                                            required
                                        />
                                    </div>

                                    <div className="flex items-center justify-between rounded-md border p-3">
                                        <div>
                                            <p className="text-sm font-medium">Advanced settings</p>
                                            <p className="text-xs text-muted-foreground">Optional outletId override for ConnectNow fetch filter.</p>
                                        </div>
                                        <Switch checked={posShowAdvanced} onCheckedChange={setPosShowAdvanced} disabled={posSaving} />
                                    </div>

                                    {posShowAdvanced ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="connectNowMerchantId">ConnectNow Merchant ID (optional)</Label>
                                            <Input
                                                id="connectNowMerchantId"
                                                value={posConnectNowMerchantId}
                                                onChange={(e) => setPosConnectNowMerchantId(e.target.value)}
                                                placeholder="MerchantID001"
                                                disabled={posSaving}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Must match the outletId shown in ConnectNow bills / last rejected order.
                                            </p>
                                        </div>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                        After integrating, you must map each outlet's POS Outlet ID to the ConnectNow bill `outletId`.
                                    </p>

                                    {posError && (
                                        <p className="text-sm text-destructive" role="alert">
                                            {posError}
                                        </p>
                                    )}

                                    {posOk && !posError && (
                                        <p className="text-sm text-muted-foreground" role="status">
                                            {posOk}
                                        </p>
                                    )}

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={posSaving}>
                                            {posSaving ? "Saving..." : "Save"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>POS Diagnostics (ConnectNow)</CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={onSyncNow}
                                        disabled={posSyncLoading || posStatusLoading || posStatus?.status !== "active"}
                                    >
                                        {posSyncLoading ? "Syncing..." : "Sync Now"}
                                    </Button>
                                    <Button variant="outline" onClick={loadPosStatus} disabled={posStatusLoading || posSyncLoading}>
                                        {posStatusLoading ? "Refreshing..." : "Refresh"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-xs text-muted-foreground">
                                    Sync Now triggers the backend container consumer job server-side. It is enabled only when integration status is active.
                                </p>

                                {posSyncError && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {posSyncError}
                                    </p>
                                )}

                                {posSyncOk && !posSyncError && (
                                    <p className="text-sm text-muted-foreground" role="status">
                                        {posSyncOk}
                                    </p>
                                )}

                                {posStatusLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading...</p>
                                ) : posStatusError ? (
                                    <p className="text-sm text-destructive" role="alert">
                                        {posStatusError}
                                    </p>
                                ) : !posStatus ? (
                                    <p className="text-sm text-muted-foreground">No POS status data.</p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
                                            <div>
                                                <div className="text-muted-foreground">Merchant ID</div>
                                                <div className="font-medium">{posStatus.merchantId || orgId}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Restaurant ID</div>
                                                <div className="font-medium">{posStatus.restaurantId || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Status</div>
                                                <div className="font-medium">{posStatus.status || "—"}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
                                            <div>
                                                <div className="text-muted-foreground">Expected OutletId</div>
                                                <div className="font-medium">{posStatus.expectedOutletId || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">connectNowMerchantId</div>
                                                <div className="font-medium">{posStatus.connectNowMerchantId || "—"}</div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            ConnectNow side must insert orders with outlet_id equal to Expected OutletId.
                                        </p>

                                        <div>
                                            <div className="text-sm font-medium mb-2">Container consumer metrics</div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
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
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
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

                        <Card>
                            <CardHeader>
                                <CardTitle>Access Code</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={onGenerateAccessCode} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="accessEmail">Email</Label>
                                        <Input
                                            id="accessEmail"
                                            value={accessEmail}
                                            onChange={(e) => setAccessEmail(e.target.value)}
                                            placeholder="user@clientabc.com"
                                            type="email"
                                            required
                                        />
                                    </div>

                                    {accessError && (
                                        <p className="text-sm text-destructive" role="alert">
                                            {accessError}
                                        </p>
                                    )}

                                    {accessResult && !accessError && (
                                        <div className="rounded-md border p-4 space-y-2">
                                            <p className="text-sm">
                                                Access code for <span className="font-medium">{accessResult.email || accessEmail}</span>
                                            </p>
                                            {expiresAtLabel ? (
                                                <p className="text-sm text-muted-foreground">
                                                    Expires at: <span className="font-medium">{expiresAtLabel}</span>
                                                </p>
                                            ) : null}
                                            <Input value={accessResult.accessCode} readOnly />
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={generatingAccessCode}>
                                            {generatingAccessCode ? "Generating..." : "Generate access code"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>WhatsApp Status</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">Configured</p>
                                    <p className="text-sm">{String(org.whatsapp?.isConfigured ?? false)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Model</p>
                                    <p className="text-sm">{org.whatsapp?.model || ""}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Token Status</p>
                                    <p className="text-sm">{org.whatsapp?.tokenStatus || ""}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Phone Number ID</p>
                                    <p className="text-sm">{org.whatsapp?.phoneNumberId || ""}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Update Phone Number ID</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={onUpdatePhone} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phoneNumberId">phoneNumberId</Label>
                                        <Input
                                            id="phoneNumberId"
                                            value={phoneNumberId}
                                            onChange={(e) => setPhoneNumberId(e.target.value)}
                                            placeholder="123456789012345"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="displayPhoneNumber">displayPhoneNumber</Label>
                                            <Input
                                                id="displayPhoneNumber"
                                                value={displayPhoneNumber}
                                                onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="displayName">displayName</Label>
                                            <Input
                                                id="displayName"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Client ABC"
                                            />
                                        </div>
                                    </div>

                                    {saveError && (
                                        <p className="text-sm text-destructive" role="alert">
                                            {saveError}
                                        </p>
                                    )}

                                    {saveOk && !saveError && (
                                        <p className="text-sm text-muted-foreground" role="status">
                                            {saveOk}
                                        </p>
                                    )}

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={saving}>
                                            {saving ? "Saving..." : "Update"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Abuse Detection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={onSaveAbuseDetection} className="space-y-4">
                                    <div className="flex items-center justify-between rounded-md border p-3">
                                        <div>
                                            <p className="text-sm font-medium">Enabled</p>
                                            <p className="text-xs text-muted-foreground">Block suspicious high-frequency order activity per phone.</p>
                                        </div>
                                        <Switch checked={abuseEnabled} onCheckedChange={setAbuseEnabled} disabled={abuseSaving} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="maxOrdersPerDayPerPhone">maxOrdersPerDayPerPhone</Label>
                                        <Input
                                            id="maxOrdersPerDayPerPhone"
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={abuseMaxOrdersPerDay}
                                            onChange={(e) => setAbuseMaxOrdersPerDay(e.target.value)}
                                            placeholder="10"
                                            disabled={abuseSaving}
                                        />
                                    </div>

                                    {abuseError && (
                                        <p className="text-sm text-destructive" role="alert">
                                            {abuseError}
                                        </p>
                                    )}

                                    {abuseOk && !abuseError && (
                                        <p className="text-sm text-muted-foreground" role="status">
                                            {abuseOk}
                                        </p>
                                    )}

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={abuseSaving}>
                                            {abuseSaving ? "Saving..." : "Save"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
