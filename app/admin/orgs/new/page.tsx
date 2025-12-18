"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { setSelectedOrgId } from "@/lib/selected-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminNewOrgPage() {
    const router = useRouter();

    const [orgId, setOrgId] = useState("");
    const [orgName, setOrgName] = useState("");
    const [timezone, setTimezone] = useState("Asia/Kolkata");
    const [userEmail, setUserEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inviteResult, setInviteResult] = useState<{
        orgId: string;
        orgName?: string;
        email: string;
        accessCode: string;
        expiresAt: string;
    } | null>(null);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setInviteResult(null);
        setIsSubmitting(true);

        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent('/admin/orgs/new')}`);
                return;
            }

            const trimmedOrgId = orgId.trim();
            const trimmedOrgName = orgName.trim();
            const trimmedTimezone = timezone.trim() || "Asia/Kolkata";
            const trimmedEmail = userEmail.trim();

            if (!trimmedOrgId || !trimmedOrgName) {
                setError("orgId and orgName are required");
                return;
            }

            if (!trimmedEmail) {
                setError("userEmail is required");
                return;
            }

            const res = await fetch("/api/admin/orgs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ orgId: trimmedOrgId, orgName: trimmedOrgName, timezone: trimmedTimezone }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent('/admin/orgs/new')}`);
                    return;
                }
                if (res.status === 403) {
                    setError('Admin access required');
                    return;
                }
                if (res.status !== 409) {
                    setError((data as any)?.error || "Failed to create org");
                    return;
                }

                setInfo("Org already exists. Proceeding to invite user...");
            }

            const createdOrgId = (data as any)?.data?.orgId || trimmedOrgId;
            setSelectedOrgId(createdOrgId);

            const inviteRes = await fetch(`/api/admin/org/${encodeURIComponent(createdOrgId)}/user`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email: trimmedEmail }),
            });

            const inviteData = await inviteRes.json().catch(() => ({}));

            if (!inviteRes.ok) {
                if (inviteRes.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent('/admin/orgs/new')}`);
                    return;
                }

                if (inviteRes.status === 403) {
                    setError('Admin access required');
                    return;
                }

                if (inviteRes.status === 409) {
                    setError("User already registered. Reset password flow not implemented here.");
                    return;
                }

                setError((inviteData as any)?.error || "Failed to invite user");
                return;
            }

            const payload = (inviteData as any)?.data;
            if (!payload?.accessCode) {
                setError("Invite succeeded but access code was not returned");
                return;
            }

            setInviteResult({
                orgId: payload.orgId || createdOrgId,
                orgName: payload.orgName,
                email: payload.email || trimmedEmail,
                accessCode: payload.accessCode,
                expiresAt: payload.expiresAt,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create org");
        } finally {
            setIsSubmitting(false);
        }
    };

    const expiresAtLabel = inviteResult?.expiresAt
        ? (() => {
            const date = new Date(inviteResult.expiresAt);
            if (Number.isNaN(date.getTime())) return inviteResult.expiresAt;
            return date.toLocaleString();
        })()
        : null;

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Client (Org)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="orgId">orgId</Label>
                                    <Input
                                        id="orgId"
                                        value={orgId}
                                        onChange={(e) => setOrgId(e.target.value)}
                                        placeholder="client_abc"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="timezone">timezone</Label>
                                    <Input
                                        id="timezone"
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        placeholder="Asia/Kolkata"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="orgName">orgName</Label>
                                <Input
                                    id="orgName"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    placeholder="Client ABC Pvt Ltd"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="userEmail">userEmail</Label>
                                <Input
                                    id="userEmail"
                                    value={userEmail}
                                    onChange={(e) => setUserEmail(e.target.value)}
                                    placeholder="user@clientabc.com"
                                    type="email"
                                    required
                                />
                            </div>

                            {info && (
                                <p className="text-sm text-muted-foreground" role="status">
                                    {info}
                                </p>
                            )}

                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                            )}

                            {inviteResult && (
                                <div className="rounded-md border p-4">
                                    <div className="space-y-2">
                                        <p className="text-sm">
                                            Access code generated for <span className="font-medium">{inviteResult.email}</span>.
                                        </p>
                                        <p className="text-sm">
                                            Expires at: <span className="font-medium">{expiresAtLabel}</span>
                                        </p>
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                            <Input value={inviteResult.accessCode} readOnly />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(inviteResult.accessCode);
                                                        setInfo("Copied access code to clipboard.");
                                                    } catch {
                                                        setError("Failed to copy. Please copy manually.");
                                                    }
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Send this code to {inviteResult.email}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Creating..." : "Create Org"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
