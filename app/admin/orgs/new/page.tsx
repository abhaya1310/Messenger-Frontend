"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
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
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent('/admin/orgs/new')}`);
                return;
            }

            const res = await fetch("/api/admin/orgs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-ORG-ID": orgId,
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ orgId, orgName, timezone }),
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
                setError((data as any)?.error || "Failed to create org");
                return;
            }

            const createdOrgId = (data as any)?.data?.orgId || orgId;
            setSelectedOrgId(createdOrgId);
            router.push(`/admin/orgs/${encodeURIComponent(createdOrgId)}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create org");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader />
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

                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
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
