"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { setSelectedOrgId } from "@/lib/selected-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DotStatus = "red" | "yellow" | "green" | string;

type CreditsState = {
    balances: { utility: number; marketing: number };
    reserved: { utility: number; marketing: number };
    available: { utility: number; marketing: number };
};

type AdminOrgListItem = {
    orgId: string;
    orgName?: string;
    timezone?: string;
    updatedAt?: string;
    dotStatus: DotStatus;
    dotReason?: string;
    whatsapp?: {
        isConfigured?: boolean;
        phoneNumberId?: string;
        model?: string;
        tokenStatus?: string;
    };
    credits?: CreditsState;
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

type AdminOrgCreditsResponse = {
    success: boolean;
    data: CreditsState;
};

type LedgerEntry = {
    _id: string;
    createdAt: string;
    bucket: "utility" | "marketing";
    eventType: string;
    delta: number;
    balanceAfter?: number;
    reservedAfter?: number;
    meta?: Record<string, unknown>;
};

type LedgerResponse = {
    success: boolean;
    data: {
        items?: LedgerEntry[];
        entries?: LedgerEntry[];
        limit?: number;
        skip?: number;
        total?: number;
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

export default function AdminOrgCreditsPage() {
    const params = useParams<{ orgId: string }>();
    const orgId = params.orgId;
    const router = useRouter();

    const [orgHeader, setOrgHeader] = useState<AdminOrgListItem | null>(null);
    const [orgHeaderError, setOrgHeaderError] = useState<string | null>(null);

    const [credits, setCredits] = useState<CreditsState | null>(null);
    const [loadingCredits, setLoadingCredits] = useState(true);
    const [creditsError, setCreditsError] = useState<string | null>(null);

    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loadingLedger, setLoadingLedger] = useState(true);
    const [ledgerError, setLedgerError] = useState<string | null>(null);

    const [bucketFilter, setBucketFilter] = useState<"all" | "utility" | "marketing">("all");
    const [limit, setLimit] = useState(50);
    const [skip, setSkip] = useState(0);

    const [refillBucket, setRefillBucket] = useState<"utility" | "marketing">("marketing");
    const [refillAmount, setRefillAmount] = useState<string>("");
    const [refillIdempotencyKey, setRefillIdempotencyKey] = useState<string>("");
    const [refillNote, setRefillNote] = useState<string>("");
    const [refilling, setRefilling] = useState(false);
    const [refillError, setRefillError] = useState<string | null>(null);
    const [refillOk, setRefillOk] = useState<string | null>(null);

    const ledgerQuery = useMemo(() => {
        const qs = new URLSearchParams();
        qs.set("limit", String(limit));
        qs.set("skip", String(skip));
        if (bucketFilter !== "all") qs.set("bucket", bucketFilter);
        return qs.toString();
    }, [bucketFilter, limit, skip]);

    const requireToken = (): string | null => {
        const token = getAuthToken();
        if (!token) {
            clearAuth();
            router.replace(`/login?next=${encodeURIComponent(`/admin/orgs/${orgId}/credits`)}`);
            return null;
        }
        return token;
    };

    const loadOrgHeader = async () => {
        setOrgHeaderError(null);
        try {
            const token = requireToken();
            if (!token) return;

            const qs = new URLSearchParams();
            qs.set("q", orgId);
            qs.set("limit", "1");
            qs.set("skip", "0");

            const res = await fetch(`/api/admin/orgs?${qs.toString()}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}/credits`)}`);
                    return;
                }
                if (res.status === 403) {
                    setOrgHeaderError("Admin access required");
                    setOrgHeader(null);
                    return;
                }

                setOrgHeaderError((data as any)?.error || "Failed to fetch org header");
                setOrgHeader(null);
                return;
            }

            const parsed = data as AdminOrgsListResponse;
            const item = Array.isArray(parsed?.data?.items) ? parsed.data.items[0] : null;
            setOrgHeader(item || null);
        } catch (err) {
            setOrgHeaderError(err instanceof Error ? err.message : "Failed to fetch org header");
            setOrgHeader(null);
        }
    };

    const loadCredits = async () => {
        setLoadingCredits(true);
        setCreditsError(null);
        try {
            const token = requireToken();
            if (!token) return;

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/credits`, {
                headers: { Authorization: `Bearer ${token}`, "X-ORG-ID": orgId },
            });
            const data = (await res.json().catch(() => ({}))) as any;

            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}/credits`)}`);
                    return;
                }
                if (res.status === 403) {
                    setCreditsError("Admin access required");
                    setCredits(null);
                    return;
                }
                setCreditsError(data?.error || "Failed to fetch credits");
                setCredits(null);
                return;
            }

            const parsed = data as AdminOrgCreditsResponse;
            setCredits(parsed.data || null);
        } catch (err) {
            setCreditsError(err instanceof Error ? err.message : "Failed to fetch credits");
            setCredits(null);
        } finally {
            setLoadingCredits(false);
        }
    };

    const loadLedger = async () => {
        setLoadingLedger(true);
        setLedgerError(null);
        try {
            const token = requireToken();
            if (!token) return;

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/credits/ledger?${ledgerQuery}`, {
                headers: { Authorization: `Bearer ${token}`, "X-ORG-ID": orgId },
            });
            const data = (await res.json().catch(() => ({}))) as any;

            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}/credits`)}`);
                    return;
                }
                if (res.status === 403) {
                    setLedgerError("Admin access required");
                    setLedger([]);
                    return;
                }
                setLedgerError(data?.error || "Failed to fetch ledger");
                setLedger([]);
                return;
            }

            const parsed = data as LedgerResponse;
            const items = (parsed.data?.items || parsed.data?.entries || []) as LedgerEntry[];
            setLedger(Array.isArray(items) ? items : []);
        } catch (err) {
            setLedgerError(err instanceof Error ? err.message : "Failed to fetch ledger");
            setLedger([]);
        } finally {
            setLoadingLedger(false);
        }
    };

    useEffect(() => {
        setSelectedOrgId(orgId);
        loadOrgHeader();
        loadCredits();
    }, [orgId]);

    useEffect(() => {
        loadLedger();
    }, [orgId, ledgerQuery]);

    const onRefill = async (e: FormEvent) => {
        e.preventDefault();
        setRefillError(null);
        setRefillOk(null);

        const amount = Number(refillAmount);
        if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
            setRefillError("Amount must be a positive integer");
            return;
        }

        setRefilling(true);
        try {
            const token = requireToken();
            if (!token) return;

            const res = await fetch(`/api/admin/org/${encodeURIComponent(orgId)}/credits/refill`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "X-ORG-ID": orgId,
                },
                body: JSON.stringify({
                    bucket: refillBucket,
                    amount,
                    idempotencyKey: refillIdempotencyKey.trim() || undefined,
                    note: refillNote.trim() || undefined,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 401) {
                    clearAuth();
                    router.replace(`/login?reason=session_expired&next=${encodeURIComponent(`/admin/orgs/${orgId}/credits`)}`);
                    return;
                }
                if (res.status === 403) {
                    setRefillError("Admin access required");
                    return;
                }
                setRefillError((data as any)?.error || "Failed to refill credits");
                return;
            }

            const already = Boolean((data as any)?.data?.alreadyRefilled);
            setRefillOk(already ? "Refill already applied (idempotent)." : "Credits refilled.");
            await loadCredits();
            await loadLedger();
        } catch (err) {
            setRefillError(err instanceof Error ? err.message : "Failed to refill credits");
        } finally {
            setRefilling(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Credits</h1>
                        <div className="flex items-center gap-2">
                            {orgHeader?.dotStatus ? (
                                <div
                                    className={`h-3 w-3 rounded-full ${dotClass(orgHeader.dotStatus)}`}
                                    title={orgHeader.dotReason || orgHeader.dotStatus}
                                />
                            ) : null}
                            <p className="text-sm text-muted-foreground">
                                Org: {orgHeader?.orgName ? `${orgHeader.orgName} (${orgId})` : orgId}
                            </p>
                        </div>
                        {orgHeaderError && (
                            <p className="text-sm text-destructive" role="alert">
                                {orgHeaderError}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/admin/orgs">All orgs</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/admin/orgs/${encodeURIComponent(orgId)}`}>Back to org</Link>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Balances</CardTitle>
                            <Button variant="outline" onClick={loadCredits} disabled={loadingCredits}>
                                Refresh
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {creditsError && (
                                <p className="text-sm text-destructive" role="alert">
                                    {creditsError}
                                </p>
                            )}

                            {loadingCredits ? (
                                <p className="text-sm text-muted-foreground">Loading...</p>
                            ) : credits ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bucket</TableHead>
                                            <TableHead className="text-right">Balances</TableHead>
                                            <TableHead className="text-right">Reserved</TableHead>
                                            <TableHead className="text-right">Available</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Utility</TableCell>
                                            <TableCell className="text-right">{fmt(credits.balances.utility)}</TableCell>
                                            <TableCell className="text-right">{fmt(credits.reserved.utility)}</TableCell>
                                            <TableCell className="text-right font-medium">{fmt(credits.available.utility)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Marketing</TableCell>
                                            <TableCell className="text-right">{fmt(credits.balances.marketing)}</TableCell>
                                            <TableCell className="text-right">{fmt(credits.reserved.marketing)}</TableCell>
                                            <TableCell className="text-right font-medium">{fmt(credits.available.marketing)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground">No credits data.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Refill</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={onRefill} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Bucket</Label>
                                    <Select value={refillBucket} onValueChange={(v) => setRefillBucket(v as any)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="utility">Utility</SelectItem>
                                            <SelectItem value="marketing">Marketing</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={refillAmount}
                                        onChange={(e) => setRefillAmount(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="idempotencyKey">Reference/Invoice (optional)</Label>
                                    <Input
                                        id="idempotencyKey"
                                        value={refillIdempotencyKey}
                                        onChange={(e) => setRefillIdempotencyKey(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="note">Note (optional)</Label>
                                    <Input id="note" value={refillNote} onChange={(e) => setRefillNote(e.target.value)} />
                                </div>

                                {refillError && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {refillError}
                                    </p>
                                )}
                                {refillOk && !refillError && (
                                    <p className="text-sm text-muted-foreground" role="status">
                                        {refillOk}
                                    </p>
                                )}

                                <Button type="submit" disabled={refilling}>
                                    {refilling ? "Refilling..." : "Refill"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Ledger</CardTitle>
                        <div className="flex gap-2">
                            <Select value={bucketFilter} onValueChange={(v) => setBucketFilter(v as any)}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Bucket" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="utility">Utility</SelectItem>
                                    <SelectItem value="marketing">Marketing</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={loadLedger} disabled={loadingLedger}>
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {ledgerError && (
                            <p className="text-sm text-destructive" role="alert">
                                {ledgerError}
                            </p>
                        )}

                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="limit" className="text-sm">Limit</Label>
                                <Input
                                    id="limit"
                                    type="number"
                                    min={1}
                                    value={String(limit)}
                                    onChange={(e) => setLimit(Math.max(1, Number(e.target.value || 1)))}
                                    className="w-[110px]"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setSkip(Math.max(0, skip - limit))} disabled={skip === 0}>
                                    Prev
                                </Button>
                                <Button variant="outline" onClick={() => setSkip(skip + limit)}>
                                    Next
                                </Button>
                            </div>
                        </div>

                        {loadingLedger ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : ledger.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No ledger entries.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Bucket</TableHead>
                                        <TableHead className="text-right">Delta</TableHead>
                                        <TableHead className="text-right">Balance After</TableHead>
                                        <TableHead className="text-right">Reserved After</TableHead>
                                        <TableHead>Meta</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ledger.map((e) => (
                                        <TableRow key={e._id}>
                                            <TableCell className="whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</TableCell>
                                            <TableCell className="uppercase text-xs">{e.eventType}</TableCell>
                                            <TableCell className="capitalize">{e.bucket}</TableCell>
                                            <TableCell className="text-right font-medium">{fmt(e.delta)}</TableCell>
                                            <TableCell className="text-right">{fmt(e.balanceAfter)}</TableCell>
                                            <TableCell className="text-right">{fmt(e.reservedAfter)}</TableCell>
                                            <TableCell className="max-w-[360px] truncate" title={e.meta ? JSON.stringify(e.meta) : ""}>
                                                {e.meta ? JSON.stringify(e.meta) : ""}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
