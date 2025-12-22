"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminCampaignRunsLandingPage() {
    const router = useRouter();
    const [runId, setRunId] = useState("");
    const [error, setError] = useState<string | null>(null);

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        const id = runId.trim();
        if (!id) {
            setError("Run ID is required");
            return;
        }
        router.push(`/admin/campaign-runs/${encodeURIComponent(id)}`);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Campaign Run Diagnostics</h1>
                    <p className="text-sm text-muted-foreground">Admin-only tooling for inspecting and reconciling a single run.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Open run</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="runId">Run ID</Label>
                                <Input id="runId" value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="66f2a9..." />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                            )}

                            <div className="flex justify-end">
                                <Button type="submit">Open</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
