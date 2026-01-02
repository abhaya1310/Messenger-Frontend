"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, RefreshCcw, Search, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { clearAuth, getAuthToken } from "@/lib/auth";
import { fetchCampaignConfigCreated, fetchCampaignRuns, fetchCampaignsCreated } from "@/lib/api";
import type { Campaign, CreateCampaignRequest } from "@/lib/types/campaign";
import type { CampaignDefinition, CampaignDefinitionTemplateVariableMapping } from "@/lib/types/campaign-definition";
import type { CampaignDefinitionSummary } from "@/lib/types/campaign-run";
import { MessagePreview } from "@/components/message-preview";

type ToastState = { type: "success" | "error"; message: string } | null;

async function parseJsonSafe(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

function campaignId(c: Campaign): string {
    return String((c as any)?._id || (c as any)?.id || "");
}

function statusBadgeVariant(status: Campaign["status"]) {
    switch (status) {
        case "preparing":
            return "warning" as const;
        case "scheduled":
            return "outline" as const;
        case "active":
            return "default" as const;
        case "completed":
            return "success" as const;
        case "failed":
            return "destructive" as const;
        case "cancelled":
            return "secondary" as const;
        case "paused":
            return "outline" as const;
        case "draft":
        default:
            return "secondary" as const;
    }
}

function statusIcon(status: Campaign["status"]) {
    switch (status) {
        case "preparing":
            return <Loader2 className="h-4 w-4 animate-spin" />;
        case "scheduled":
            return <Calendar className="h-4 w-4" />;
        case "active":
            return <Clock className="h-4 w-4" />;
        case "completed":
            return <CheckCircle className="h-4 w-4" />;
        case "failed":
            return <XCircle className="h-4 w-4" />;
        case "cancelled":
            return <XCircle className="h-4 w-4" />;
        default:
            return <Clock className="h-4 w-4" />;
    }
}

function safeNumber(value: string): number | undefined {
    const v = String(value || "").trim();
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return n;
}

function parseCsv(value: string): string[] {
    return (value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function parsePhoneList(value: string): string[] {
    return (value || "")
        .split(/[\n,\r\t ]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function CampaignsClient() {
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);

    const [toast, setToast] = useState<ToastState>(null);

    const showToast = (next: ToastState) => {
        setToast(next);
        if (!next) return;
        window.setTimeout(() => setToast(null), 2500);
    };

    const [autoLoading, setAutoLoading] = useState(false);
    const [autoError, setAutoError] = useState<string | null>(null);
    const [autoGroups, setAutoGroups] = useState<{ auto: any[]; utility: any[] }>({ auto: [], utility: [] });

    const [promoTab, setPromoTab] = useState<"created" | "runs">("created");
    const [promoCreatedLoading, setPromoCreatedLoading] = useState(false);
    const [promoCreatedError, setPromoCreatedError] = useState<string | null>(null);
    const [promoCreated, setPromoCreated] = useState<Campaign[]>([]);

    const [promoRunsLoading, setPromoRunsLoading] = useState(false);
    const [promoRunsError, setPromoRunsError] = useState<string | null>(null);
    const [promoRuns, setPromoRuns] = useState<Campaign[]>([]);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");

    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);

    const createdPollingRef = useRef<number | null>(null);
    const runsPollingRef = useRef<number | null>(null);

    const [createName, setCreateName] = useState("");
    const [createDescription, setCreateDescription] = useState("");
    const [createType, setCreateType] = useState<NonNullable<CreateCampaignRequest["type"]>>("promotional");

    const [definitions, setDefinitions] = useState<CampaignDefinitionSummary[]>([]);
    const [definitionsLoading, setDefinitionsLoading] = useState(false);
    const [definitionsError, setDefinitionsError] = useState<string | null>(null);

    const [createDefinitionId, setCreateDefinitionId] = useState<string>("");
    const [definitionDetail, setDefinitionDetail] = useState<CampaignDefinition | null>(null);
    const [definitionDetailLoading, setDefinitionDetailLoading] = useState(false);
    const [definitionDetailError, setDefinitionDetailError] = useState<string | null>(null);

    const [userInputValues, setUserInputValues] = useState<Record<number, string>>({});

    const [createScheduledAt, setCreateScheduledAt] = useState<string>("");

    const [createAudienceType, setCreateAudienceType] = useState<CreateCampaignRequest["audience"]["type"]>("all");

    const [createMinVisits, setCreateMinVisits] = useState("");
    const [createMaxDaysSinceLastVisit, setCreateMaxDaysSinceLastVisit] = useState("");
    const [createMinTotalSpend, setCreateMinTotalSpend] = useState("");
    const [createOutletsCsv, setCreateOutletsCsv] = useState("");
    const [createHasEmail, setCreateHasEmail] = useState<"any" | "true" | "false">("any");
    const [createHasBirthday, setCreateHasBirthday] = useState<"any" | "true" | "false">("any");

    const [segments, setSegments] = useState<Array<{ id: string; name: string; status?: string }>>([]);
    const [segmentsLoading, setSegmentsLoading] = useState(false);
    const [segmentsError, setSegmentsError] = useState<string | null>(null);
    const [createSegmentId, setCreateSegmentId] = useState<string>("");

    const [createCustomPhoneNumbersRaw, setCreateCustomPhoneNumbersRaw] = useState("");

    const [catalogPreviewOpen, setCatalogPreviewOpen] = useState(false);
    const [catalogPreview, setCatalogPreview] = useState<CampaignDefinitionSummary | null>(null);
    const [catalogPreviewDetail, setCatalogPreviewDetail] = useState<CampaignDefinition | null>(null);
    const [catalogPreviewLoading, setCatalogPreviewLoading] = useState(false);
    const [catalogPreviewError, setCatalogPreviewError] = useState<string | null>(null);

    const mappingList = useMemo(() => {
        const raw = (definitionDetail as any)?.templateVariableMappings;
        const list = Array.isArray(raw) ? (raw as CampaignDefinitionTemplateVariableMapping[]) : [];
        return list.slice().sort((a, b) => (a.position || 0) - (b.position || 0));
    }, [definitionDetail]);

    const userInputMappings = useMemo(() => {
        return mappingList.filter((m) => (m.sourceType || "").toLowerCase() === "user_input");
    }, [mappingList]);

    const filteredCreated = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return (promoCreated || []).filter((c) => {
            if (!q) return true;
            return (
                (c.name || "").toLowerCase().includes(q) ||
                (c.template?.name || "").toLowerCase().includes(q) ||
                campaignId(c).toLowerCase().includes(q)
            );
        });
    }, [promoCreated, searchQuery]);

    const filteredRuns = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return (promoRuns || []).filter((c) => {
            if (!q) return true;
            return (
                (c.name || "").toLowerCase().includes(q) ||
                (c.template?.name || "").toLowerCase().includes(q) ||
                campaignId(c).toLowerCase().includes(q)
            );
        });
    }, [promoRuns, searchQuery]);

    const stopCreatedPolling = () => {
        if (createdPollingRef.current) {
            window.clearInterval(createdPollingRef.current);
            createdPollingRef.current = null;
        }
    };

    const confirmDelete = async () => {
        const target = deleteTarget;
        const id = target ? campaignId(target) : "";
        if (!id) {
            setDeleteOpen(false);
            setDeleteTarget(null);
            return;
        }

        if (deletingId) return;

        const prevIndex = promoCreated.findIndex((c) => campaignId(c) === id);
        setDeletingId(id);
        setPromoCreated((prev) => prev.filter((c) => campaignId(c) !== id));

        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.push("/login?reason=session_expired");
                return;
            }

            const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const payload = await parseJsonSafe(res);

            if (res.status === 401) {
                clearAuth();
                router.push("/login?reason=session_expired");
                return;
            }

            if (res.status === 200) {
                showToast({ type: "success", message: "Campaign deleted" });
                setDeleteOpen(false);
                setDeleteTarget(null);
                return;
            }

            if (res.status === 404) {
                showToast({ type: "success", message: "Campaign already deleted" });
                setDeleteOpen(false);
                setDeleteTarget(null);
                return;
            }

            const err = payload as any;
            const code = String(err?.error || err?.code || err?.data?.error || "");
            if (res.status === 409 && code === "campaign_not_deletable") {
                showToast({ type: "error", message: "Campaign already started and cannot be deleted" });
                setDeleteOpen(false);
                setDeleteTarget(null);
                await Promise.all([loadPromotionalCreated({ silent: true }), loadPromotionalRuns({ silent: true })]);
                return;
            }

            showToast({ type: "error", message: "Failed to delete campaign. Please try again." });
            setPromoCreated((current) => {
                if (current.some((c) => campaignId(c) === id)) return current;
                if (!target) return current;
                const next = current.slice();
                const idx = prevIndex >= 0 && prevIndex <= next.length ? prevIndex : 0;
                next.splice(idx, 0, target);
                return next;
            });
            setDeleteOpen(false);
            setDeleteTarget(null);
        } catch {
            showToast({ type: "error", message: "Failed to delete campaign. Please try again." });
            setPromoCreated((current) => {
                if (current.some((c) => campaignId(c) === id)) return current;
                if (!target) return current;
                const next = current.slice();
                const idx = prevIndex >= 0 && prevIndex <= next.length ? prevIndex : 0;
                next.splice(idx, 0, target);
                return next;
            });
            setDeleteOpen(false);
            setDeleteTarget(null);
        } finally {
            setDeletingId(null);
        }
    };

    const stopRunsPolling = () => {
        if (runsPollingRef.current) {
            window.clearInterval(runsPollingRef.current);
            runsPollingRef.current = null;
        }
    };

    const canDeleteCampaign = (c: Campaign) => {
        return c.status === "draft" || c.status === "preparing" || c.status === "scheduled";
    };

    const loadAutoCampaigns = async () => {
        setAutoError(null);
        setAutoLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                setAutoGroups({ auto: [], utility: [] });
                return;
            }

            const raw = await fetchCampaignConfigCreated();
            const data: any = (raw as any)?.data ?? raw;
            const items: any[] =
                (Array.isArray(data?.items) ? data.items : null) ||
                (Array.isArray((raw as any)?.items) ? (raw as any).items : null) ||
                (Array.isArray(data) ? data : []);

            const auto = items.filter((i) => String(i?.category || "").toLowerCase() === "auto");
            const utility = items.filter((i) => String(i?.category || "").toLowerCase() === "utility");
            setAutoGroups({ auto, utility });
        } catch (e) {
            setAutoGroups({ auto: [], utility: [] });
            setAutoError(e instanceof Error ? e.message : "Failed to load auto campaigns");
        } finally {
            setAutoLoading(false);
        }
    };

    const loadPromotionalCreated = async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setPromoCreatedLoading(true);
        setPromoCreatedError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                setPromoCreated([]);
                setPromoCreatedError("Your session has expired. Please log in again.");
                clearAuth();
                router.push("/login?reason=session_expired");
                return;
            }

            const res = await fetchCampaignsCreated({ limit: 50, skip: 0 });
            const data: any = (res as any)?.data ?? res;
            const items: any[] =
                (Array.isArray(data?.items) ? data.items : null) ||
                (Array.isArray((res as any)?.items) ? (res as any).items : null) ||
                (Array.isArray(data) ? data : []);

            setPromoCreated(items as Campaign[]);
        } catch (e) {
            setPromoCreated([]);
            setPromoCreatedError(e instanceof Error ? e.message : "Failed to load created campaigns");
        } finally {
            if (!opts?.silent) setPromoCreatedLoading(false);
        }
    };

    const loadPromotionalRuns = async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setPromoRunsLoading(true);
        setPromoRunsError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                setPromoRuns([]);
                setPromoRunsError("Your session has expired. Please log in again.");
                clearAuth();
                router.push("/login?reason=session_expired");
                return;
            }

            const res = await fetchCampaignRuns({ limit: 50, skip: 0 });
            const data: any = (res as any)?.data ?? res;
            const items: any[] =
                (Array.isArray(data?.items) ? data.items : null) ||
                (Array.isArray((res as any)?.items) ? (res as any).items : null) ||
                (Array.isArray(data) ? data : []);

            setPromoRuns(items as Campaign[]);
        } catch (e) {
            setPromoRuns([]);
            setPromoRunsError(e instanceof Error ? e.message : "Failed to load campaign runs");
        } finally {
            if (!opts?.silent) setPromoRunsLoading(false);
        }
    };

    const loadCatalogPreviewDetail = async (id: string) => {
        setCatalogPreviewError(null);
        setCatalogPreviewLoading(true);
        setCatalogPreviewDetail(null);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }

            const res = await fetch(`/api/campaign-runs/definitions/${encodeURIComponent(id)}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await parseJsonSafe(res);
            if (res.status === 401) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }
            if (!res.ok) {
                const msg = (json as any)?.error || (json as any)?.message || "Failed to load definition";
                throw new Error(msg);
            }

            const def = ((json as any)?.data || json) as CampaignDefinition;
            setCatalogPreviewDetail(def);
        } catch (e) {
            setCatalogPreviewDetail(null);
            setCatalogPreviewError(e instanceof Error ? e.message : "Failed to load definition");
        } finally {
            setCatalogPreviewLoading(false);
        }
    };

    useEffect(() => {
        loadAutoCampaigns();
        loadPromotionalCreated();
        loadPromotionalRuns();
        return () => {
            stopCreatedPolling();
            stopRunsPolling();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const anyPreparing = promoCreated.some((c) => c.status === "preparing");
        if (!anyPreparing) {
            stopCreatedPolling();
            return;
        }
        if (createdPollingRef.current) return;
        createdPollingRef.current = window.setInterval(() => {
            loadPromotionalCreated({ silent: true });
        }, 7000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [promoCreated]);

    useEffect(() => {
        const anyActive = promoRuns.some((c) => c.status === "active");
        if (!anyActive) {
            stopRunsPolling();
            return;
        }
        if (runsPollingRef.current) return;
        runsPollingRef.current = window.setInterval(() => {
            loadPromotionalRuns({ silent: true });
        }, 15000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [promoRuns]);

    useEffect(() => {
        loadDefinitions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openCreate = () => {
        setError(null);
        setShowCreate(true);

        setCreateName("");
        setCreateDescription("");
        setCreateType("promotional");
        setCreateDefinitionId("");
        setDefinitionDetail(null);
        setDefinitionDetailError(null);
        setUserInputValues({});
        setCreateScheduledAt("");

        setCreateAudienceType("all");
        setCreateMinVisits("");
        setCreateMaxDaysSinceLastVisit("");
        setCreateMinTotalSpend("");
        setCreateOutletsCsv("");
        setCreateHasEmail("any");
        setCreateHasBirthday("any");

        setCreateCustomPhoneNumbersRaw("");
        setCreateSegmentId("");

        loadDefinitions();
        loadSegments();
    };

    const openCreateWithDefinition = (id: string) => {
        openCreate();
        setCreateDefinitionId(id);
        if (id) loadDefinitionDetail(id);
    };

    const loadDefinitions = async () => {
        setDefinitionsError(null);
        setDefinitionsLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }

            const res = await fetch("/api/campaign-runs/definitions", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await parseJsonSafe(res);
            if (res.status === 401) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }
            if (!res.ok) {
                const msg = (json as any)?.error || (json as any)?.message || "Failed to load campaign catalog";
                throw new Error(msg);
            }

            const items = ((json as any)?.data || []) as CampaignDefinitionSummary[];
            setDefinitions(Array.isArray(items) ? items : []);
        } catch (e) {
            setDefinitions([]);
            setDefinitionsError(e instanceof Error ? e.message : "Failed to load campaign catalog");
        } finally {
            setDefinitionsLoading(false);
        }
    };

    const loadDefinitionDetail = async (id: string) => {
        setDefinitionDetailError(null);
        setDefinitionDetailLoading(true);
        setDefinitionDetail(null);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }

            const res = await fetch(`/api/campaign-runs/definitions/${encodeURIComponent(id)}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await parseJsonSafe(res);
            if (res.status === 401) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }
            if (!res.ok) {
                const msg = (json as any)?.error || (json as any)?.message || "Failed to load definition";
                throw new Error(msg);
            }

            const def = ((json as any)?.data || json) as CampaignDefinition;
            setDefinitionDetail(def);

            const rawMappings = (def as any)?.templateVariableMappings;
            const mappings = Array.isArray(rawMappings) ? (rawMappings as CampaignDefinitionTemplateVariableMapping[]) : [];
            const defaults: Record<number, string> = {};
            for (const m of mappings) {
                if ((m.sourceType || "").toLowerCase() !== "user_input") continue;
                defaults[m.position] = "";
            }
            setUserInputValues(defaults);
        } catch (e) {
            setDefinitionDetail(null);
            setDefinitionDetailError(e instanceof Error ? e.message : "Failed to load definition");
        } finally {
            setDefinitionDetailLoading(false);
        }
    };

    const loadSegments = async () => {
        setSegmentsError(null);
        setSegmentsLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }

            const res = await fetch("/api/segments?limit=50&skip=0", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await parseJsonSafe(res);
            if (res.status === 401) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }
            if (!res.ok) {
                const msg = (json as any)?.error || (json as any)?.message || "Failed to load segments";
                throw new Error(msg);
            }

            const items = ((json as any)?.data?.items || []) as any[];
            const next = Array.isArray(items)
                ? items
                    .map((s) => ({ id: String(s.id || s._id || ""), name: String(s.name || ""), status: s.status }))
                    .filter((s) => s.id)
                    .sort((a, b) => a.name.localeCompare(b.name))
                : [];
            setSegments(next);
        } catch (e) {
            setSegments([]);
            setSegmentsError(e instanceof Error ? e.message : "Failed to load segments");
        } finally {
            setSegmentsLoading(false);
        }
    };

    const createCampaign = async () => {
        setError(null);

        if (!createName.trim() || !createScheduledAt) {
            setError("Please fill in required fields");
            return;
        }
        if (!createDefinitionId) {
            setError("Please select a campaign from the catalog");
            return;
        }
        if (!definitionDetail) {
            setError("Please wait for the campaign details to load");
            return;
        }

        for (const m of userInputMappings) {
            const required = m.required !== false;
            if (!required) continue;
            const v = String(userInputValues?.[m.position] ?? "").trim();
            if (!v) {
                setError(`Please provide a value for {{${m.position}}}`);
                return;
            }
        }

        if (createAudienceType === "custom") {
            const nums = parsePhoneList(createCustomPhoneNumbersRaw);
            if (nums.length === 0) {
                setError("Please provide at least one phone number");
                return;
            }
        }

        if (createAudienceType === "segment" && !createSegmentId) {
            setError("Please select a segment");
            return;
        }

        setCreating(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const filters: any = {};
            const minVisits = safeNumber(createMinVisits);
            if (minVisits !== undefined) filters.minVisits = minVisits;

            const maxDaysSinceLastVisit = safeNumber(createMaxDaysSinceLastVisit);
            if (maxDaysSinceLastVisit !== undefined) filters.maxDaysSinceLastVisit = maxDaysSinceLastVisit;

            const minTotalSpend = safeNumber(createMinTotalSpend);
            if (minTotalSpend !== undefined) filters.minTotalSpend = minTotalSpend;

            const outlets = parseCsv(createOutletsCsv);
            if (outlets.length > 0) filters.outlets = outlets;

            if (createHasEmail !== "any") filters.hasEmail = createHasEmail === "true";
            if (createHasBirthday !== "any") filters.hasBirthday = createHasBirthday === "true";

            const cleanedUserInputs: Record<string, string> = {};
            for (const m of userInputMappings) {
                const val = String(userInputValues?.[m.position] ?? "").trim();
                if (!val) continue;
                cleanedUserInputs[String(m.position)] = val;
            }

            const payload: CreateCampaignRequest = {
                name: createName.trim(),
                description: createDescription.trim() || undefined,
                type: createType,
                scheduledAt: createScheduledAt,
                campaignDefinitionId: createDefinitionId,
                ...(Object.keys(cleanedUserInputs).length > 0 ? { userInputParameters: cleanedUserInputs } : {}),
                audience: {
                    type: createAudienceType,
                    ...(createAudienceType === "custom"
                        ? { customPhoneNumbers: parsePhoneList(createCustomPhoneNumbersRaw) }
                        : createAudienceType === "segment"
                            ? { segmentId: createSegmentId }
                            : Object.keys(filters).length > 0
                                ? { filters }
                                : {}),
                },
            };

            const res = await fetch("/api/campaigns", {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });

            if (res.status === 401) {
                clearAuth();
                router.push("/login?reason=session_expired");
                throw new Error("Your session has expired. Please log in again.");
            }

            const json = await parseJsonSafe(res);
            if (!res.ok) {
                const msg = (json as any)?.error || (json as any)?.message || "Failed to create campaign";
                throw new Error(msg);
            }

            const created = ((json as any)?.data || (json as any)) as Campaign;
            const id = campaignId(created);
            setShowCreate(false);

            await Promise.all([loadPromotionalCreated({ silent: true }), loadPromotionalRuns({ silent: true })]);

            if (id) {
                router.push(`/campaigns/${encodeURIComponent(id)}`);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create campaign");
        } finally {
            setCreating(false);
        }
    };

    const minDate = new Date().toISOString().split("T")[0];

    function substituteTemplateText(params: {
        text?: string;
        sampleValues?: Record<string, string>;
        userValues?: Record<number, string>;
        mappings?: CampaignDefinitionTemplateVariableMapping[];
    }): string {
        const raw = params.text || "";
        if (!raw) return "";
        return raw.replace(/\{\{(\d+)\}\}/g, (_match, idxRaw) => {
            const idx = String(idxRaw);
            const uv = params.userValues?.[Number(idx)];
            if (uv && String(uv).trim()) return String(uv);
            const dummy = params.sampleValues?.[idx];
            if (dummy && String(dummy).trim()) return String(dummy);

            const mapping = params.mappings?.find((m) => String(m.position) === idx);
            if (mapping) {
                const st = String(mapping.sourceType || "").toLowerCase();
                const fp = String(mapping.fieldPath || "");
                if (st === "customer") {
                    const path = fp.startsWith("customer.") ? fp.slice("customer.".length) : fp;
                    return `[customer.${path}]`;
                }
                if (st === "transaction") {
                    const path = fp.startsWith("transaction.") ? fp.slice("transaction.".length) : fp;
                    return `[transaction.${path}]`;
                }
                if (st === "user_input") {
                    return "[user input]";
                }
            }

            return `{{${idx}}}`;
        });
    }

    const campaignPreviewText = useMemo(() => {
        const p = definitionDetail?.template?.preview;
        if (!p) return "";
        const rawMappings = (definitionDetail as any)?.templateVariableMappings;
        const mappings = Array.isArray(rawMappings) ? (rawMappings as CampaignDefinitionTemplateVariableMapping[]) : [];

        const header = substituteTemplateText({
            text: p.headerText,
            sampleValues: p.sampleValues,
            userValues: userInputValues,
            mappings,
        });
        const body = substituteTemplateText({
            text: p.bodyText,
            sampleValues: p.sampleValues,
            userValues: userInputValues,
            mappings,
        });
        const footer = substituteTemplateText({
            text: p.footerText,
            sampleValues: p.sampleValues,
            userValues: userInputValues,
            mappings,
        });
        return [header, body, footer].filter(Boolean).join("\n\n");
    }, [definitionDetail, userInputValues]);

    const catalogItems = useMemo(() => {
        return (definitions || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [definitions]);

    const catalogPreviewText = useMemo(() => {
        const p = catalogPreviewDetail?.template?.preview || catalogPreview?.template?.preview;
        if (!p) return "";

        const rawMappings = (catalogPreviewDetail as any)?.templateVariableMappings;
        const mappings = Array.isArray(rawMappings) ? (rawMappings as CampaignDefinitionTemplateVariableMapping[]) : [];

        const header = substituteTemplateText({ text: p.headerText, sampleValues: p.sampleValues, mappings });
        const body = substituteTemplateText({ text: p.bodyText, sampleValues: p.sampleValues, mappings });
        const footer = substituteTemplateText({ text: p.footerText, sampleValues: p.sampleValues, mappings });
        return [header, body, footer].filter(Boolean).join("\n\n");
    }, [catalogPreview, catalogPreviewDetail]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-start justify-between gap-4 py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                            <p className="text-gray-600 mt-1">Create campaigns. Audience is prepared asynchronously by the backend.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/campaigns/runs">Campaign Runs</Link>
                            </Button>
                            <Button onClick={openCreate} className="gap-2">
                                <Plus className="h-4 w-4" />
                                New Campaign
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Breadcrumb items={[{ label: "Campaigns" }]} />

                {toast && (
                    <div
                        className={
                            "fixed bottom-4 right-4 z-50 rounded-md border px-4 py-3 shadow-lg text-sm " +
                            (toast.type === "success" ? "bg-green-50 border-green-200 text-green-900" : "bg-red-50 border-red-200 text-red-900")
                        }
                        role="status"
                    >
                        {toast.message}
                    </div>
                )}

                {error && (
                    <Card className="mb-6 border-destructive/30">
                        <CardContent className="pt-6">
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Published Campaign Catalog</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {definitionsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading catalog…
                            </div>
                        ) : definitionsError ? (
                            <div className="text-sm text-destructive" role="alert">
                                {definitionsError}
                            </div>
                        ) : catalogItems.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No published campaigns available.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {catalogItems.slice(0, 6).map((d) => {
                                    const previewBody = d.template?.preview?.bodyText
                                        ? substituteTemplateText({ text: d.template.preview.bodyText, sampleValues: d.template.preview.sampleValues })
                                        : "";
                                    return (
                                        <div key={d._id} className="rounded-md border p-4 space-y-2">
                                            <div className="font-medium">{d.name}</div>
                                            {d.description ? <div className="text-sm text-muted-foreground">{d.description}</div> : null}
                                            {previewBody ? (
                                                <div className="rounded-md bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                                                    {previewBody.length > 220 ? `${previewBody.slice(0, 220)}…` : previewBody}
                                                </div>
                                            ) : null}
                                            <div className="flex gap-2 pt-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setCatalogPreview(d);
                                                        setCatalogPreviewOpen(true);
                                                        void loadCatalogPreviewDetail(d._id);
                                                    }}
                                                >
                                                    Preview
                                                </Button>
                                                <Button size="sm" onClick={() => openCreateWithDefinition(d._id)}>
                                                    Use this campaign
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
                        <CardTitle className="text-base">Auto Campaigns</CardTitle>
                        <Button size="sm" variant="outline" onClick={loadAutoCampaigns} disabled={autoLoading} className="gap-2">
                            {autoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            Refresh
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {autoLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading…
                            </div>
                        ) : autoError ? (
                            <div className="text-sm text-destructive" role="alert">
                                {autoError}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm font-medium">Auto</div>
                                    {autoGroups.auto.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">No auto campaigns configured.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                            {autoGroups.auto.map((i) => (
                                                <div key={String(i?.key || i?.id || i?.name || Math.random())} className="rounded-md border p-3">
                                                    <div className="font-medium">{String(i?.title || i?.name || i?.key || "Auto campaign")}</div>
                                                    {i?.description ? <div className="text-xs text-muted-foreground">{String(i.description)}</div> : null}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="text-sm font-medium">Utility</div>
                                    {autoGroups.utility.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">No utility campaigns configured.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                            {autoGroups.utility.map((i) => (
                                                <div key={String(i?.key || i?.id || i?.name || Math.random())} className="rounded-md border p-3">
                                                    <div className="font-medium">{String(i?.title || i?.name || i?.key || "Utility campaign")}</div>
                                                    {i?.description ? <div className="text-xs text-muted-foreground">{String(i.description)}</div> : null}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Promotional Campaigns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[240px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by name or template..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => (promoTab === "created" ? loadPromotionalCreated() : loadPromotionalRuns())}
                                disabled={promoTab === "created" ? promoCreatedLoading : promoRunsLoading}
                                className="gap-2"
                            >
                                {(promoTab === "created" ? promoCreatedLoading : promoRunsLoading) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCcw className="h-4 w-4" />
                                )}
                                Refresh
                            </Button>
                        </div>

                        <Tabs value={promoTab} onValueChange={(v) => setPromoTab(v as any)}>
                            <TabsList>
                                <TabsTrigger value="created">Created</TabsTrigger>
                                <TabsTrigger value="runs">Runs</TabsTrigger>
                            </TabsList>

                            <TabsContent value="created" className="space-y-3">
                                {promoCreatedError ? (
                                    <div className="text-sm text-destructive" role="alert">
                                        {promoCreatedError}
                                    </div>
                                ) : promoCreatedLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading…
                                    </div>
                                ) : filteredCreated.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No created campaigns found.</div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Scheduled At</TableHead>
                                                <TableHead>Template</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCreated.map((c) => {
                                                const id = campaignId(c);
                                                const canDelete = Boolean(id) && canDeleteCampaign(c);
                                                const busy = deletingId === id;
                                                return (
                                                    <TableRow
                                                        key={id}
                                                        className="cursor-pointer"
                                                        onClick={() => id && router.push(`/campaigns/${encodeURIComponent(id)}`)}
                                                    >
                                                        <TableCell>
                                                            <div className="font-medium">{c.name}</div>
                                                            <div className="text-xs text-muted-foreground">{id}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={statusBadgeVariant(c.status)} className="gap-1">
                                                                {statusIcon(c.status)}
                                                                {c.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}</TableCell>
                                                        <TableCell className="text-sm">{c.template?.name || "—"}</TableCell>
                                                        <TableCell className="text-right">
                                                            {canDelete ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-red-600 hover:text-red-700 gap-2"
                                                                    disabled={busy}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setDeleteTarget(c);
                                                                        setDeleteOpen(true);
                                                                    }}
                                                                >
                                                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                                    Delete
                                                                </Button>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </TabsContent>

                            <TabsContent value="runs" className="space-y-3">
                                {promoRunsError ? (
                                    <div className="text-sm text-destructive" role="alert">
                                        {promoRunsError}
                                    </div>
                                ) : promoRunsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading…
                                    </div>
                                ) : filteredRuns.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No runs found.</div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Executed</TableHead>
                                                <TableHead>Completed</TableHead>
                                                <TableHead>Progress</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRuns.map((c) => {
                                                const id = campaignId(c);
                                                const target = Number((c.metrics as any)?.targetCount || 0);
                                                const sent = Number((c.metrics as any)?.sentCount || 0);
                                                const failed = Number((c.metrics as any)?.failedCount || 0);
                                                const denom = target > 0 ? target : 0;
                                                const progress = denom > 0 ? Math.min(1, (sent + failed) / denom) : 0;
                                                const pct = denom > 0 ? Math.round(progress * 100) : 0;

                                                return (
                                                    <TableRow
                                                        key={id}
                                                        className="cursor-pointer"
                                                        onClick={() => id && router.push(`/campaigns/${encodeURIComponent(id)}`)}
                                                    >
                                                        <TableCell>
                                                            <div className="font-medium">{c.name}</div>
                                                            <div className="text-xs text-muted-foreground">{id}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={statusBadgeVariant(c.status)} className="gap-1">
                                                                {statusIcon(c.status)}
                                                                {c.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{(c as any)?.executedAt ? new Date((c as any).executedAt).toLocaleString() : "—"}</TableCell>
                                                        <TableCell className="text-sm">{(c as any)?.completedAt ? new Date((c as any).completedAt).toLocaleString() : "—"}</TableCell>
                                                        <TableCell className="text-sm">
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between">
                                                                    <span>
                                                                        {sent}/{target} sent
                                                                    </span>
                                                                    <span className="text-muted-foreground">{pct}%</span>
                                                                </div>
                                                                <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                                                                    <div className="h-2 bg-gray-900" style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">Failed: {failed}</div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>

            <Dialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    setDeleteOpen(open);
                    if (!open) {
                        setDeleteTarget(null);
                        setDeletingId(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete campaign?</DialogTitle>
                        <DialogDescription>
                            This will remove the campaign and any queued messages. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteOpen(false);
                                setDeleteTarget(null);
                            }}
                            disabled={Boolean(deletingId)}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={Boolean(deletingId)} className="gap-2">
                            {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={catalogPreviewOpen}
                onOpenChange={(open) => {
                    setCatalogPreviewOpen(open);
                    if (!open) {
                        setCatalogPreview(null);
                        setCatalogPreviewDetail(null);
                        setCatalogPreviewError(null);
                        setCatalogPreviewLoading(false);
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Campaign Preview</DialogTitle>
                        <DialogDescription>Preview uses admin dummy values. User inputs can be configured next.</DialogDescription>
                    </DialogHeader>

                    {catalogPreviewLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading preview…
                        </div>
                    ) : catalogPreviewError ? (
                        <div className="text-sm text-destructive" role="alert">
                            {catalogPreviewError}
                        </div>
                    ) : catalogPreview && catalogPreviewText ? (
                        <MessagePreview
                            templateName={catalogPreview.template?.name || catalogPreview.name}
                            language={catalogPreview.template?.language || ""}
                            preview={catalogPreviewText}
                        />
                    ) : (
                        <div className="text-sm text-muted-foreground">No preview available.</div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCatalogPreviewOpen(false)}>
                            Close
                        </Button>
                        {catalogPreview ? (
                            <Button
                                onClick={() => {
                                    setCatalogPreviewOpen(false);
                                    openCreateWithDefinition(catalogPreview._id);
                                }}
                            >
                                Use this campaign
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New Campaign</DialogTitle>
                        <DialogDescription>
                            Campaign creation is async. After creating, the backend will prepare audience and the campaign will move from
                            preparing → scheduled.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="campaign" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="campaign">Campaign</TabsTrigger>
                            <TabsTrigger value="audience">Audience</TabsTrigger>
                            <TabsTrigger value="schedule">Schedule</TabsTrigger>
                        </TabsList>

                        <TabsContent value="campaign" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Diwali Blast 2025" />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="Optional" />
                            </div>

                            <div className="space-y-2">
                                <Label>Type *</Label>
                                <Select value={createType} onValueChange={(v) => setCreateType(v as any)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="promotional">Promotional</SelectItem>
                                        <SelectItem value="event">Event</SelectItem>
                                        <SelectItem value="announcement">Announcement</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Campaign *</Label>
                                <Select
                                    value={createDefinitionId}
                                    onValueChange={(v) => {
                                        setCreateDefinitionId(v);
                                        if (v) loadDefinitionDetail(v);
                                    }}
                                    disabled={definitionsLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                definitionsLoading
                                                    ? "Loading catalog…"
                                                    : definitions.length === 0
                                                        ? "No published campaigns"
                                                        : "Select a campaign"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {definitions.map((d) => (
                                            <SelectItem key={d._id} value={d._id}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {definitionsError ? (
                                    <div className="text-xs text-destructive" role="alert">
                                        {definitionsError}
                                    </div>
                                ) : null}
                            </div>

                            {createDefinitionId ? (
                                <div className="rounded-md border p-4 space-y-2">
                                    {definitionDetailLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading campaign details…
                                        </div>
                                    ) : definitionDetailError ? (
                                        <div className="text-sm text-destructive" role="alert">
                                            {definitionDetailError}
                                        </div>
                                    ) : definitionDetail ? (
                                        <>
                                            <div className="text-sm font-medium">Template</div>
                                            <div className="text-xs text-muted-foreground break-all">
                                                {definitionDetail.template?.name} ({definitionDetail.template?.language})
                                            </div>
                                            {definitionDetail.template?.preview?.bodyText ? (
                                                <MessagePreview
                                                    templateName={definitionDetail.template?.name}
                                                    language={definitionDetail.template?.language}
                                                    preview={campaignPreviewText || definitionDetail.template.preview.bodyText}
                                                />
                                            ) : null}

                                            {mappingList.length > 0 ? (
                                                <div className="border-t pt-3 space-y-2">
                                                    <div className="text-sm font-medium">Template Variables</div>
                                                    <div className="space-y-3">
                                                        {mappingList.map((m) => {
                                                            const label = m.sourceType === "user_input" ? (m.label || `{{${m.position}}}`) : `{{${m.position}}}`;
                                                            const isUserInput = (m.sourceType || "").toLowerCase() === "user_input";
                                                            const isRequired = m.required !== false;
                                                            const displayValue = isUserInput
                                                                ? String(userInputValues?.[m.position] ?? "")
                                                                : m.sourceType === "customer" || m.sourceType === "transaction"
                                                                    ? String(m.fieldPath || "")
                                                                    : "";

                                                            return (
                                                                <div key={m.position} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border p-3">
                                                                    <div className="text-xs font-medium text-gray-700">{`{{${m.position}}}`}</div>
                                                                    <div className="text-xs text-muted-foreground capitalize">{m.sourceType?.replace("_", " ")}</div>
                                                                    <div className="space-y-1">
                                                                        {isUserInput ? (
                                                                            <>
                                                                                <Label className="text-xs">
                                                                                    {label}
                                                                                    {isRequired ? " *" : ""}
                                                                                </Label>
                                                                                <Input
                                                                                    value={displayValue}
                                                                                    onChange={(e) => {
                                                                                        const next = e.target.value;
                                                                                        setUserInputValues((prev) => ({
                                                                                            ...prev,
                                                                                            [m.position]: next,
                                                                                        }));
                                                                                    }}
                                                                                    placeholder="Enter value"
                                                                                />
                                                                            </>
                                                                        ) : (
                                                                            <div className="text-xs text-gray-700 break-all">{displayValue || "—"}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </>
                                    ) : null}
                                </div>
                            ) : null}
                        </TabsContent>

                        <TabsContent value="audience" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Audience Type *</Label>
                                <Select value={createAudienceType} onValueChange={(v) => setCreateAudienceType(v as any)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All (filters)</SelectItem>
                                        <SelectItem value="segment">Segment</SelectItem>
                                        <SelectItem value="custom">Custom phone numbers</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {createAudienceType === "custom" ? (
                                <div className="space-y-2">
                                    <Label>Phone numbers *</Label>
                                    <Textarea
                                        value={createCustomPhoneNumbersRaw}
                                        onChange={(e) => setCreateCustomPhoneNumbersRaw(e.target.value)}
                                        placeholder="+919999999999\n+918888888888"
                                    />
                                    <div className="text-xs text-muted-foreground">
                                        Enter phone numbers separated by new lines or commas.
                                    </div>
                                </div>
                            ) : null}

                            {createAudienceType === "segment" ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label>Segment *</Label>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => loadSegments()}
                                            disabled={segmentsLoading}
                                            className="gap-2"
                                        >
                                            {segmentsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                            Refresh
                                        </Button>
                                    </div>
                                    <Select value={createSegmentId} onValueChange={setCreateSegmentId} disabled={segmentsLoading}>
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={
                                                    segmentsLoading
                                                        ? "Loading segments…"
                                                        : segments.length === 0
                                                            ? "No segments"
                                                            : "Select a segment"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {segments.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {segmentsError ? (
                                        <div className="text-xs text-destructive" role="alert">
                                            {segmentsError}
                                        </div>
                                    ) : null}
                                    <div className="text-xs text-muted-foreground">
                                        Segment computation happens on-demand when you create the campaign.
                                    </div>
                                </div>
                            ) : null}

                            {createAudienceType === "all" ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Min Visits</Label>
                                            <Input value={createMinVisits} onChange={(e) => setCreateMinVisits(e.target.value)} placeholder="e.g. 3" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Days Since Last Visit</Label>
                                            <Input
                                                value={createMaxDaysSinceLastVisit}
                                                onChange={(e) => setCreateMaxDaysSinceLastVisit(e.target.value)}
                                                placeholder="e.g. 60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Min Total Spend</Label>
                                            <Input
                                                value={createMinTotalSpend}
                                                onChange={(e) => setCreateMinTotalSpend(e.target.value)}
                                                placeholder="e.g. 5000"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Outlets (comma separated outlet IDs)</Label>
                                        <Input value={createOutletsCsv} onChange={(e) => setCreateOutletsCsv(e.target.value)} placeholder="outlet_1,outlet_2" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Has Email</Label>
                                            <Select value={createHasEmail} onValueChange={(v) => setCreateHasEmail(v as any)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">Any</SelectItem>
                                                    <SelectItem value="true">Yes</SelectItem>
                                                    <SelectItem value="false">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Has Birthday</Label>
                                            <Select value={createHasBirthday} onValueChange={(v) => setCreateHasBirthday(v as any)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">Any</SelectItem>
                                                    <SelectItem value="true">Yes</SelectItem>
                                                    <SelectItem value="false">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        Audience count is computed by the backend after campaign creation.
                                    </div>
                                </div>
                            ) : null}

                            {createAudienceType === "all" ? (
                                <div className="text-sm text-muted-foreground">
                                    This campaign will target all eligible customers (backend exclusions still apply).
                                </div>
                            ) : null}
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-4 mt-4">
                            <DateTimePicker
                                label="Scheduled At *"
                                value={createScheduledAt}
                                onChange={setCreateScheduledAt}
                                minDate={minDate}
                                required
                            />
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
                            Cancel
                        </Button>
                        <Button onClick={createCampaign} disabled={creating} className="gap-2">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Create Campaign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
