"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TemplateVariableMappings, TemplateVariableMapping, MappingSource } from "@/lib/types/template-variable-mapping";

export type TemplateVariable = {
    index: number;
    context: string;
    label: string;
    required?: boolean;
};

type Option = { label: string; value: string };

type Props = {
    templateVariables: TemplateVariable[];
    value: TemplateVariableMappings;
    onChange: (next: TemplateVariableMappings) => void;

    customerOptions: Option[];
    transactionOptions: Option[];

    invalidIndices?: number[];
};

function normalizeSource(source: MappingSource) {
    if (source === "customer") return "customer" as const;
    if (source === "transaction") return "transaction" as const;
    return "static" as const;
}

function getSource(mapping: TemplateVariableMapping | undefined): MappingSource | "" {
    if (!mapping) return "";
    return normalizeSource(mapping.source);
}

function setMappingForSource(opts: {
    index: number;
    source: MappingSource;
    customerOptions: Option[];
    transactionOptions: Option[];
}): TemplateVariableMapping {
    const idx = opts.index;
    if (opts.source === "customer") {
        return { source: "customer", path: opts.customerOptions?.[0]?.value || "" };
    }
    if (opts.source === "transaction") {
        return { source: "transaction", path: opts.transactionOptions?.[0]?.value || "" };
    }
    return { source: "static", value: "" };
}

export function validateTemplateVariableMappings(params: {
    templateVariables: Array<{ index: number }>;
    mappings: TemplateVariableMappings;
}): { ok: true } | { ok: false; invalidIndices: number[] } {
    const invalid: number[] = [];

    for (const v of params.templateVariables) {
        const key = String(v.index);
        const mapping = params.mappings[key];
        if (!mapping) {
            invalid.push(v.index);
            continue;
        }

        if (mapping.source === "static") {
            if (!String(mapping.value ?? "").trim()) invalid.push(v.index);
            continue;
        }

        if (!String((mapping as any).path ?? "").trim()) invalid.push(v.index);
    }

    if (invalid.length > 0) {
        return { ok: false, invalidIndices: invalid };
    }

    return { ok: true };
}

export function TemplateVariableMapper(props: Props) {
    const vars = props.templateVariables || [];

    const invalidSet = useMemo(() => {
        return new Set<number>(props.invalidIndices || []);
    }, [props.invalidIndices]);

    if (vars.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm">Variable Mapping (Live)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                    Choose where each template variable should come from (Customer / Transaction) or set a fixed value.
                </p>

                <div className="space-y-3">
                    {vars.map((v) => {
                        const key = String(v.index);
                        const mapping = props.value?.[key];
                        const source = getSource(mapping);
                        const isInvalid = invalidSet.has(v.index);

                        return (
                            <div
                                key={key}
                                className={cn(
                                    "grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border p-3",
                                    isInvalid ? "border-destructive/60 bg-destructive/5" : "border-border"
                                )}
                            >
                                <div className="space-y-1">
                                    <div className="text-xs font-medium text-gray-700">{`{{${v.index}}}`}</div>
                                    {v.context ? (
                                        <div className="text-xs text-muted-foreground break-words">{v.context}</div>
                                    ) : null}
                                    {isInvalid ? (
                                        <div className="text-xs text-destructive" role="alert">
                                            Mapping required for {`{{${v.index}}}`}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Mapping type</Label>
                                        <Select
                                            value={source}
                                            onValueChange={(nextSource) => {
                                                const s = nextSource as MappingSource;
                                                const next = {
                                                    ...(props.value || {}),
                                                    [key]: setMappingForSource({
                                                        index: v.index,
                                                        source: s,
                                                        customerOptions: props.customerOptions,
                                                        transactionOptions: props.transactionOptions,
                                                    }),
                                                } satisfies TemplateVariableMappings;
                                                props.onChange(next);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select mapping" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="customer">Customer field</SelectItem>
                                                <SelectItem value="transaction">Transaction field</SelectItem>
                                                <SelectItem value="static">Set your own</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {source === "customer" ? (
                                        <div className="space-y-1">
                                            <Label className="text-xs">Customer field</Label>
                                            <Select
                                                value={(mapping as any)?.path || ""}
                                                onValueChange={(path) => {
                                                    const next = {
                                                        ...(props.value || {}),
                                                        [key]: { source: "customer", path },
                                                    } satisfies TemplateVariableMappings;
                                                    props.onChange(next);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select customer field" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {props.customerOptions.map((o) => (
                                                        <SelectItem key={o.value} value={o.value}>
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : null}

                                    {source === "transaction" ? (
                                        <div className="space-y-1">
                                            <Label className="text-xs">Transaction field</Label>
                                            <Select
                                                value={(mapping as any)?.path || ""}
                                                onValueChange={(path) => {
                                                    const next = {
                                                        ...(props.value || {}),
                                                        [key]: { source: "transaction", path },
                                                    } satisfies TemplateVariableMappings;
                                                    props.onChange(next);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select transaction field" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {props.transactionOptions.map((o) => (
                                                        <SelectItem key={o.value} value={o.value}>
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : null}

                                    {source === "static" ? (
                                        <div className="space-y-1">
                                            <Label className="text-xs">Static value</Label>
                                            <Input
                                                value={(mapping as any)?.value || ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const next = {
                                                        ...(props.value || {}),
                                                        [key]: { source: "static", value },
                                                    } satisfies TemplateVariableMappings;
                                                    props.onChange(next);
                                                }}
                                                placeholder="Enter fixed text"
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
