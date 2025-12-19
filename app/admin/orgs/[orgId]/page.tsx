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

type OrgDetailsResponse = {
    success: boolean;
    data: {
        orgId: string;
        orgName: string;
        timezone?: string;
        services?: Record<string, unknown>;
        features?: Record<string, unknown>;
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

    const [accessEmail, setAccessEmail] = useState("");
    const [generatingAccessCode, setGeneratingAccessCode] = useState(false);
    const [accessError, setAccessError] = useState<string | null>(null);
    const [accessResult, setAccessResult] = useState<{ accessCode: string; expiresAt?: string; email?: string } | null>(null);

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
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch org");
            setOrg(null);
        } finally {
            setLoading(false);
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
    }, [orgId]);

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
                    </>
                )}
            </div>
        </div>
    );
}
