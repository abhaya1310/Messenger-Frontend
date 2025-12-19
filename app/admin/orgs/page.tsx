"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { setSelectedOrgId } from "@/lib/selected-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DotStatus = "red" | "yellow" | "green" | string;

type AdminOrgListItem = {
    orgId: string;
    orgName?: string;
    timezone?: string;
    createdAt?: string;
    updatedAt?: string;
    dotStatus: DotStatus;
    dotReason?: string;
    userOnboarding?: {
        status?: string;
        passwordCreated?: boolean;
        registrationUsedAt?: string;
    };
    whatsapp?: {
        isConfigured?: boolean;
        phoneNumberId?: string;
        model?: string;
        tokenStatus?: string;
    };
    credits?: {
        balances: { utility: number; marketing: number };
        reserved: { utility: number; marketing: number };
        available: { utility: number; marketing: number };
    };
};

type AdminOrgsListResponse = {
    success: true;
    data: {
        items: AdminOrgListItem[];
        pagination: {
            limit: number;
            skip: number;
            count: number;
            total: number;
        };
    };
};

function fmt(n: unknown): string {
    return typeof n === "number" ? n.toLocaleString() : "—";
}

function dotClass(status: DotStatus): string {
    switch (status) {
        case "green":
            return "bg-green-500";
        case "yellow":
            return "bg-yellow-500";
        case "red":
            return "bg-red-500";
        default:
            return "bg-gray-300";
    }
}

export default function AdminOrgsListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const q = searchParams.get("q") || "";
    const limit = useMemo(() => {
        const raw = Number(searchParams.get("limit") || 50);
        if (!Number.isFinite(raw)) return 50;
        return Math.min(200, Math.max(1, Math.floor(raw)));
    }, [searchParams]);
    const skip = useMemo(() => {
        const raw = Number(searchParams.get("skip") || 0);
        if (!Number.isFinite(raw)) return 0;
        return Math.max(0, Math.floor(raw));
    }, [searchParams]);

    const [qDraft, setQDraft] = useState(q);

    const [orgs, setOrgs] = useState<AdminOrgListItem[]>([]);
    const [pagination, setPagination] = useState<AdminOrgsListResponse["data"]["pagination"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const setUrlParams = (next: { q?: string; limit?: number; skip?: number }) => {
        const params = new URLSearchParams(searchParams.toString());
        if (typeof next.q === "string") {
            const val = next.q.trim();
            if (val) params.set("q", val);
            else params.delete("q");
        }
        if (typeof next.limit === "number") params.set("limit", String(next.limit));
        if (typeof next.skip === "number") params.set("skip", String(next.skip));
        const qs = params.toString();
        router.push(qs ? `/admin/orgs?${qs}` : "/admin/orgs");
    };

    const load = async (opts: { q: string; limit: number; skip: number }) => {
        setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.replace(`/login?next=${encodeURIComponent("/admin/orgs")}`);
                return;
            }

            const qs = new URLSearchParams();
            qs.set("limit", String(opts.limit));
            qs.set("skip", String(opts.skip));
            if (opts.q) qs.set("q", opts.q);

            const res = await fetch(`/api/admin/orgs?${qs.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const text = await res.text();
            let data: any = undefined;
            try {
                data = text ? JSON.parse(text) : undefined;
            } catch {
                data = text;
            }

            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent("/admin/orgs")}`);
                    return;
                }
                if (res.status === 403) {
                    setError("Admin access required (403)");
                    setOrgs([]);
                    setPagination(null);
                    return;
                }

                const backendMessage =
                    typeof data === "string"
                        ? data
                        : typeof data?.error === "string"
                            ? data.error
                            : typeof data?.message === "string"
                                ? data.message
                                : undefined;

                setError(
                    `Failed to fetch orgs (${res.status}${res.statusText ? ` ${res.statusText}` : ""})` +
                    (backendMessage ? `: ${backendMessage}` : "")
                );
                setOrgs([]);
                setPagination(null);
                return;
            }

            const parsed = data as AdminOrgsListResponse;
            setOrgs(Array.isArray(parsed?.data?.items) ? parsed.data.items : []);
            setPagination(parsed?.data?.pagination || null);
        } catch (err) {
            setError(err instanceof Error ? `Network error: ${err.message}` : "Network error");
            setOrgs([]);
            setPagination(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setQDraft(q);
    }, [q]);

    useEffect(() => {
        load({ q, limit, skip });
    }, [q, limit, skip]);

    const onSearch = (e: FormEvent) => {
        e.preventDefault();
        setUrlParams({ q: qDraft, skip: 0 });
    };

    const pageSummary = pagination
        ? `${pagination.skip + 1}-${pagination.skip + pagination.count} of ${pagination.total}`
        : "";

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Orgs</h1>
                        <p className="text-sm text-muted-foreground">All orgs (dot status + WhatsApp + credits).</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => load({ q, limit, skip })} disabled={loading}>
                            Refresh
                        </Button>
                        <Button asChild>
                            <Link href="/admin/orgs/new">New org</Link>
                        </Button>
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-destructive" role="alert">
                        {error}
                    </p>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Organisation List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSearch} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                            <div className="flex gap-2 w-full md:max-w-xl">
                                <Input
                                    value={qDraft}
                                    onChange={(e) => setQDraft(e.target.value)}
                                    placeholder="Search orgId or orgName"
                                />
                                <Button type="submit" variant="outline">Search</Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Limit</span>
                                <select
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    value={String(limit)}
                                    onChange={(e) => setUrlParams({ limit: Number(e.target.value), skip: 0 })}
                                >
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                </select>
                                {pageSummary ? <span className="text-sm text-muted-foreground">{pageSummary}</span> : null}
                            </div>
                        </form>

                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : orgs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No orgs found.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Org Name</TableHead>
                                        <TableHead>Org ID</TableHead>
                                        <TableHead>Timezone</TableHead>
                                        <TableHead>WhatsApp</TableHead>
                                        <TableHead className="text-right">Utility (A/R/T)</TableHead>
                                        <TableHead className="text-right">Marketing (A/R/T)</TableHead>
                                        <TableHead>Updated</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orgs.map((o) => (
                                        <TableRow
                                            key={o.orgId}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setSelectedOrgId(o.orgId);
                                                router.push(`/admin/orgs/${encodeURIComponent(o.orgId)}`);
                                            }}
                                        >
                                            <TableCell>
                                                <div
                                                    className={`h-3 w-3 rounded-full ${dotClass(o.dotStatus)}`}
                                                    title={o.dotReason || o.dotStatus}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{o.orgName || o.orgId}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{o.orgId}</TableCell>
                                            <TableCell className="text-sm">{o.timezone || ""}</TableCell>
                                            <TableCell>
                                                <div
                                                    className="text-sm"
                                                    title={
                                                        `isConfigured: ${String(Boolean(o.whatsapp?.isConfigured))}` +
                                                        (o.whatsapp?.phoneNumberId ? `\nphoneNumberId: ${o.whatsapp.phoneNumberId}` : "") +
                                                        (o.whatsapp?.model ? `\nmodel: ${o.whatsapp.model}` : "")
                                                    }
                                                >
                                                    {String(Boolean(o.whatsapp?.isConfigured))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {fmt(o.credits?.available?.utility)} / {fmt(o.credits?.reserved?.utility)} / {fmt(o.credits?.balances?.utility)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {fmt(o.credits?.available?.marketing)} / {fmt(o.credits?.reserved?.marketing)} / {fmt(o.credits?.balances?.marketing)}
                                            </TableCell>
                                            <TableCell className="text-sm">{o.updatedAt ? new Date(o.updatedAt).toLocaleString() : ""}</TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                        onClick={() => setSelectedOrgId(o.orgId)}
                                                    >
                                                        <Link href={`/admin/orgs/${encodeURIComponent(o.orgId)}/credits`}>Credits</Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {pagination && pagination.total > pagination.limit && (
                            <div className="flex items-center justify-end gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setUrlParams({ skip: Math.max(0, skip - limit) })}
                                    disabled={skip === 0 || loading}
                                >
                                    Prev
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setUrlParams({ skip: skip + limit })}
                                    disabled={skip + limit >= pagination.total || loading}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
