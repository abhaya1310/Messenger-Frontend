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

            const trimmedOrgId = orgId.trim();
            const trimmedOrgName = orgName.trim();
            const trimmedTimezone = timezone.trim() || "Asia/Kolkata";

            if (!trimmedOrgId || !trimmedOrgName) {
                setError("orgId and orgName are required");
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

            const text = await res.text();
            let data: any = undefined;
            try {
                data = text ? JSON.parse(text) : undefined;
            } catch {
                data = text;
            }

            if (!res.ok) {
                const backendMessage =
                    typeof data === "string"
                        ? data
                        : typeof data?.error === "string"
                            ? data.error
                            : typeof data?.message === "string"
                                ? data.message
                                : undefined;

                setError(
                    `Failed to create org (${res.status}${res.statusText ? ` ${res.statusText}` : ""})` +
                    (backendMessage ? `: ${backendMessage}` : "")
                );
                return;
            }

            const createdOrgId = (data as any)?.data?.orgId || trimmedOrgId;
            setSelectedOrgId(createdOrgId);
            router.push(`/admin/orgs/${encodeURIComponent(createdOrgId)}`);
        } catch (err) {
            setError(err instanceof Error ? `Network error: ${err.message}` : "Network error");
        } finally {
            setIsSubmitting(false);
        }
    };

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
