import { NextResponse, type NextRequest } from "next/server";

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
}

function getUserAuthHeaders(request: NextRequest): Record<string, string> | null {
    const authorization = request.headers.get("authorization");
    if (!authorization) return null;

    const orgIdHeader = request.headers.get("x-org-id");

    return {
        Authorization: authorization,
        ...(orgIdHeader ? { "X-ORG-ID": orgIdHeader } : {}),
    };
}

async function parseBackendResponse(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { orgId } = await ctx.params;

    const res = await fetch(`${getBackendBaseUrl()}/api/org-settings/${encodeURIComponent(orgId)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders,
        },
    });

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
