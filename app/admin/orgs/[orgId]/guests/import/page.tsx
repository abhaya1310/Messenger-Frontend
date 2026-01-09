"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud } from "lucide-react";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { setSelectedOrgId } from "@/lib/selected-org";

type ImportUploadResponse = {
    success: boolean;
    jobId: string;
    status: "queued" | "processing" | "completed" | "failed" | string;
    deduped?: boolean;
};

async function safeJson(res: Response) {
    return (await res.json().catch(() => ({}))) as any;
}

export default function AdminOrgGuestImportPage() {
    const params = useParams<{ orgId: string }>();
    const orgId = params.orgId;
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canUpload = useMemo(() => {
        if (!file) return false;
        const name = (file.name || "").toLowerCase();
        return name.endsWith(".csv");
    }, [file]);

    const onUpload = async () => {
        setError(null);
        if (!file) {
            setError("Please choose a file.");
            return;
        }
        if (!canUpload) {
            setError("Only .csv files are supported.");
            return;
        }

        setUploading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${encodeURIComponent(orgId)}/guests/import`)}`);
                return;
            }

            const form = new FormData();
            form.set("file", file, file.name);

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/guests/import`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: form,
            });

            const json = (await safeJson(res)) as ImportUploadResponse;
            if (!res.ok) {
                throw new Error((json as any)?.error || (json as any)?.message || "Failed to upload file.");
            }

            const nextJobId = (json as any)?.jobId;
            if (!nextJobId) {
                throw new Error("Upload succeeded but jobId was missing.");
            }

            router.push(
                `/admin/orgs/${encodeURIComponent(orgId)}/guests/import/${encodeURIComponent(nextJobId)}`
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to upload file.");
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        setSelectedOrgId(orgId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Guests</h1>
                        <p className="text-gray-600 mt-1">Upload a .csv to import guest data for this organisation.</p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <Breadcrumb
                    items={[
                        { label: "Admin", href: "/admin" },
                        { label: "Orgs", href: "/admin/orgs" },
                        { label: orgId, href: `/admin/orgs/${encodeURIComponent(orgId)}` },
                        { label: "Guests" },
                        { label: "Bulk Upload" },
                    ]}
                />

                {error ? (
                    <Card className="border-destructive/30">
                        <CardContent className="pt-6">
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        </CardContent>
                    </Card>
                ) : null}

                <Card>
                    <CardHeader>
                        <CardTitle>Upload file</CardTitle>
                        <CardDescription>Backend will enqueue an import job. You can monitor status below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="guest-import-file">CSV file</Label>
                            <Input
                                id="guest-import-file"
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                disabled={uploading}
                            />
                            <p className="text-xs text-muted-foreground">Accepted: .csv. Field name: file.</p>
                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
                                <div className="font-medium text-foreground">Expected header</div>
                                <div className="font-mono">phone,name,email,dob,anniversary</div>
                                <div>
                                    Supported columns (case-insensitive):
                                    <span className="font-mono"> phone</span>, <span className="font-mono">name</span>, <span className="font-mono">email</span>, <span className="font-mono">dob</span>, <span className="font-mono">anniversary</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={onUpload} disabled={uploading || !file} className="gap-2">
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                Upload
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </main>
        </div>
    );
}
