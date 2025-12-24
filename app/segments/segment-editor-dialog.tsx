"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getAuthToken } from "@/lib/auth";
import type { NumericRule, Segment, SegmentRules, SegmentResponse } from "@/lib/types/segments";

type NumericMode = "none" | "gt" | "lt" | "between";

type NumericDraft = {
    mode: NumericMode;
    gt?: string;
    lt?: string;
    betweenMin?: string;
    betweenMax?: string;
};

type SegmentDraft = {
    name: string;

    visitCount: NumericDraft;
    totalSpend: NumericDraft;
    recencyDays: NumericDraft;

    outletInclude: string;
    outletExclude: string;

    excludeSuspectedEmployee: boolean;
    excludeHighFrequency: boolean;

    status: "draft" | "active";
};

type SegmentTemplate = {
    id: string;
    label: string;
    name: string;
    rules: SegmentRules;
};

const templates: SegmentTemplate[] = [
    { id: "none", label: "None", name: "", rules: {} },
    { id: "new", label: "New (visited in last 7 days)", name: "New", rules: { recencyDays: { lt: 7 } } },
    {
        id: "vip",
        label: "VIP (high spend + recent)",
        name: "VIP",
        rules: { totalSpend: { gt: 5000 }, recencyDays: { lt: 60 } },
    },
    {
        id: "loyal",
        label: "Loyal (frequent visitors)",
        name: "Loyal",
        rules: { visitCount: { gt: 6 } },
    },
    {
        id: "promising",
        label: "Promising (medium spend + recent)",
        name: "Promising",
        rules: { totalSpend: { between: [1000, 5000] }, recencyDays: { lt: 30 } },
    },
    {
        id: "need-attention",
        label: "Need attention (no visit in 30–90 days)",
        name: "Need Attention",
        rules: { recencyDays: { between: [30, 90] } },
    },
    {
        id: "at-risk",
        label: "At risk (no visit in 60+ days)",
        name: "At Risk",
        rules: { recencyDays: { gt: 60 } },
    },
    {
        id: "lost",
        label: "Lost (no visit in 180+ days)",
        name: "Lost",
        rules: { recencyDays: { gt: 180 } },
    },
];

async function safeJson(res: Response) {
    return (await res.json().catch(() => ({}))) as any;
}

function parseNumber(value?: string): number | undefined {
    if (!value) return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    return n;
}

function parseCsv(value?: string): string[] | undefined {
    const raw = (value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return raw.length ? raw : undefined;
}

function segmentId(s: Segment): string {
    return String(s.id || s._id || "");
}

function defaultDraft(): SegmentDraft {
    return {
        name: "",
        visitCount: { mode: "none" },
        totalSpend: { mode: "none" },
        recencyDays: { mode: "none" },
        outletInclude: "",
        outletExclude: "",
        excludeSuspectedEmployee: true,
        excludeHighFrequency: true,
        status: "active",
    };
}

function numericDraftFromRule(rule?: NumericRule): NumericDraft {
    if (!rule) return { mode: "none" };
    if (Array.isArray(rule.between) && rule.between.length === 2) {
        return { mode: "between", betweenMin: String(rule.between[0]), betweenMax: String(rule.between[1]) };
    }
    if (typeof rule.gt === "number") return { mode: "gt", gt: String(rule.gt) };
    if (typeof rule.lt === "number") return { mode: "lt", lt: String(rule.lt) };
    return { mode: "none" };
}

function numericRuleFromDraft(d: NumericDraft): NumericRule | undefined {
    if (!d || d.mode === "none") return undefined;
    if (d.mode === "gt") {
        const gt = parseNumber(d.gt);
        return gt === undefined ? undefined : { gt };
    }
    if (d.mode === "lt") {
        const lt = parseNumber(d.lt);
        return lt === undefined ? undefined : { lt };
    }
    if (d.mode === "between") {
        const a = parseNumber(d.betweenMin);
        const b = parseNumber(d.betweenMax);
        return a === undefined || b === undefined ? undefined : { between: [a, b] };
    }
    return undefined;
}

function draftFromSegment(s: Segment): SegmentDraft {
    const rules = s.rules || {};
    return {
        name: s.name || "",
        visitCount: numericDraftFromRule(rules.visitCount),
        totalSpend: numericDraftFromRule(rules.totalSpend),
        recencyDays: numericDraftFromRule(rules.recencyDays),
        outletInclude: (rules.outlet?.include || []).join(", "),
        outletExclude: (rules.outlet?.exclude || []).join(", "),
        excludeSuspectedEmployee: rules.excludeFlags?.suspectedEmployee ?? true,
        excludeHighFrequency: rules.excludeFlags?.highFrequency ?? true,
        status: ((s.status as any) === "draft" ? "draft" : "active") as any,
    };
}

function rulesFromDraft(d: SegmentDraft): SegmentRules {
    const rules: SegmentRules = {};

    const visitCount = numericRuleFromDraft(d.visitCount);
    const totalSpend = numericRuleFromDraft(d.totalSpend);
    const recencyDays = numericRuleFromDraft(d.recencyDays);

    if (visitCount) rules.visitCount = visitCount;
    if (totalSpend) rules.totalSpend = totalSpend;
    if (recencyDays) rules.recencyDays = recencyDays;

    const include = parseCsv(d.outletInclude);
    const exclude = parseCsv(d.outletExclude);
    if (include || exclude) {
        rules.outlet = {
            ...(include ? { include } : {}),
            ...(exclude ? { exclude } : {}),
        };
    }

    rules.excludeFlags = {
        suspectedEmployee: d.excludeSuspectedEmployee,
        highFrequency: d.excludeHighFrequency,
    };

    return rules;
}

export default function SegmentEditorDialog(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    segment: Segment | null;
    onSaved: (segment: Segment) => void;
}) {
    const { open, onOpenChange, segment, onSaved } = props;

    const isEditing = !!segment;

    const [templateId, setTemplateId] = useState("none");
    const [draft, setDraft] = useState<SegmentDraft>(defaultDraft());
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [initialRulesJson, setInitialRulesJson] = useState<string | null>(null);
    const [initialName, setInitialName] = useState<string | null>(null);
    const [initialStatus, setInitialStatus] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        setSaveError(null);
        setTemplateId("none");

        if (segment) {
            const d = draftFromSegment(segment);
            setDraft(d);
            setInitialRulesJson(JSON.stringify(rulesFromDraft(d)));
            setInitialName((segment.name || "").trim());
            setInitialStatus(String(segment.status || ""));
        } else {
            const d = defaultDraft();
            setDraft(d);
            setInitialRulesJson(null);
            setInitialName(null);
            setInitialStatus(null);
        }
    }, [open, segment]);

    const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId), [templateId]);

    const applyTemplate = (id: string) => {
        setTemplateId(id);
        const t = templates.find((x) => x.id === id);
        if (!t || id === "none") return;

        const pseudo: Segment = { name: t.name, rules: t.rules, status: "active" };
        const next = draftFromSegment(pseudo);

        setDraft((prev) => ({
            ...prev,
            ...next,
            name: next.name || prev.name,
            excludeSuspectedEmployee: true,
            excludeHighFrequency: true,
            status: "active",
        }));
    };

    const onSave = async () => {
        setSaving(true);
        setSaveError(null);

        try {
            const token = getAuthToken();
            if (!token) throw new Error("Unauthorized");

            const name = draft.name.trim();
            if (!name) {
                setSaveError("Please enter a segment name.");
                return;
            }

            const rules = rulesFromDraft(draft);
            const rulesJson = JSON.stringify(rules);

            const payload: any = {};

            if (!isEditing) {
                payload.name = name;
                payload.rules = rules;
            } else {
                if (name !== (initialName || "")) payload.name = name;
                if (String(draft.status) !== String(initialStatus || "")) payload.status = draft.status;
                if (initialRulesJson === null || rulesJson !== initialRulesJson) payload.rules = rules;
            }

            if (Object.keys(payload).length === 0) {
                onOpenChange(false);
                return;
            }

            const id = segment ? segmentId(segment) : null;
            const res = await fetch(id ? `/api/segments/${id}` : "/api/segments", {
                method: id ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await safeJson(res);
            if (!res.ok) {
                setSaveError(json?.error || json?.message || "Failed to save segment.");
                return;
            }

            const parsed = json as SegmentResponse;
            const seg = (parsed?.data || json?.data || json) as Segment;
            onSaved(seg);
            onOpenChange(false);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : "Failed to save segment.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit segment" : "Create segment"}</DialogTitle>
                    <DialogDescription>
                        Build segments based on spend, visit frequency, recency and outlet targeting.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="segment-name">Segment name</Label>
                            <Input
                                id="segment-name"
                                value={draft.name}
                                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Dormant 90+"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Template (optional)</Label>
                            <Select value={templateId} onValueChange={applyTemplate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isEditing ? (
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v as any }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}

                        {selectedTemplate && selectedTemplate.id !== "none" ? (
                            <div className="text-xs text-muted-foreground self-end">Prefilled: {selectedTemplate.label}</div>
                        ) : null}
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Core rules</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <NumericRuleEditor
                                title="Total spend"
                                subtitle="Total spend across visits"
                                value={draft.totalSpend}
                                onChange={(v) => setDraft((p) => ({ ...p, totalSpend: v }))}
                                unitHint="₹"
                            />

                            <NumericRuleEditor
                                title="Visit frequency"
                                subtitle="Number of visits"
                                value={draft.visitCount}
                                onChange={(v) => setDraft((p) => ({ ...p, visitCount: v }))}
                            />

                            <NumericRuleEditor
                                title="Recency (days since last visit)"
                                subtitle="gt = dormant longer than N days, lt = visited within last N days"
                                value={draft.recencyDays}
                                onChange={(v) => setDraft((p) => ({ ...p, recencyDays: v }))}
                                unitHint="days"
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Outlet targeting</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Include outlets</Label>
                                <Textarea
                                    value={draft.outletInclude}
                                    onChange={(e) => setDraft((p) => ({ ...p, outletInclude: e.target.value }))}
                                    placeholder="Comma-separated outlet IDs (e.g. A, B)"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Exclude outlets</Label>
                                <Textarea
                                    value={draft.outletExclude}
                                    onChange={(e) => setDraft((p) => ({ ...p, outletExclude: e.target.value }))}
                                    placeholder="Comma-separated outlet IDs to exclude"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Exclusions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="font-medium">Exclude suspected employees</div>
                                    <div className="text-xs text-muted-foreground">Recommended default: ON</div>
                                </div>
                                <Switch
                                    checked={draft.excludeSuspectedEmployee}
                                    onCheckedChange={(checked) => setDraft((p) => ({ ...p, excludeSuspectedEmployee: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="font-medium">Exclude high-frequency guests</div>
                                    <div className="text-xs text-muted-foreground">Recommended default: ON</div>
                                </div>
                                <Switch
                                    checked={draft.excludeHighFrequency}
                                    onCheckedChange={(checked) => setDraft((p) => ({ ...p, excludeHighFrequency: checked }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {saveError ? (
                        <p className="text-sm text-destructive" role="alert">
                            {saveError}
                        </p>
                    ) : null}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function NumericRuleEditor(props: {
    title: string;
    subtitle?: string;
    value: NumericDraft;
    onChange: (next: NumericDraft) => void;
    unitHint?: string;
}) {
    const { title, subtitle, value, onChange, unitHint } = props;

    return (
        <div className="space-y-2">
            <div>
                <div className="font-medium">{title}</div>
                {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Select value={value.mode} onValueChange={(mode) => onChange({ mode: mode as NumericMode })}>
                    <SelectTrigger className="md:col-span-1">
                        <SelectValue placeholder="Rule" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                        <SelectItem value="between">Between</SelectItem>
                    </SelectContent>
                </Select>

                {value.mode === "gt" ? (
                    <div className="md:col-span-3 flex items-center gap-2">
                        <Input
                            inputMode="numeric"
                            placeholder={unitHint ? `${unitHint} value` : "value"}
                            value={value.gt || ""}
                            onChange={(e) => onChange({ ...value, gt: e.target.value })}
                        />
                    </div>
                ) : null}

                {value.mode === "lt" ? (
                    <div className="md:col-span-3 flex items-center gap-2">
                        <Input
                            inputMode="numeric"
                            placeholder={unitHint ? `${unitHint} value` : "value"}
                            value={value.lt || ""}
                            onChange={(e) => onChange({ ...value, lt: e.target.value })}
                        />
                    </div>
                ) : null}

                {value.mode === "between" ? (
                    <div className="md:col-span-3 grid grid-cols-2 gap-2">
                        <Input
                            inputMode="numeric"
                            placeholder={unitHint ? `${unitHint} min` : "min"}
                            value={value.betweenMin || ""}
                            onChange={(e) => onChange({ ...value, betweenMin: e.target.value })}
                        />
                        <Input
                            inputMode="numeric"
                            placeholder={unitHint ? `${unitHint} max` : "max"}
                            value={value.betweenMax || ""}
                            onChange={(e) => onChange({ ...value, betweenMax: e.target.value })}
                        />
                    </div>
                ) : null}

                {value.mode === "none" ? <div className="md:col-span-3" /> : null}
            </div>
        </div>
    );
}
