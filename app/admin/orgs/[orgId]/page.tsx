"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
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

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}`);
            const data = (await res.json().catch(() => ({}))) as any;

            if (!res.ok) {
                if (res.status === 401) {
                    router.replace(`/admin/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
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

    useEffect(() => {
        load();
    }, [orgId]);

    const onUpdatePhone = async (e: FormEvent) => {
        e.preventDefault();
        setSaveOk(null);
        setSaveError(null);
        setSaving(true);

        try {
            const res = await fetch(
                `/api/admin/org/${encodeURIComponent(orgId)}/whatsapp/update-phone-number-id`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phoneNumberId, displayPhoneNumber, displayName }),
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 401) {
                    router.replace(`/admin/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}`)}`);
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
            <AdminHeader />
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Org: {orgId}</h1>
                    {org?.orgName && <p className="text-sm text-muted-foreground">{org.orgName}</p>}
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
