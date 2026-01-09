import { NextResponse, type NextRequest } from "next/server";
import { clearAdminSessionCookie, getAdminAuthHeaders } from "@/lib/admin-proxy-auth";

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
}

async function parseBackendResponse(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

export async function POST(request: NextRequest) {
    const authHeaders = await getAdminAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(`${getBackendBaseUrl()}/api/cron/guests/import/process`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders,
        },
    });

    if (res.status === 401) {
        const out = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        clearAdminSessionCookie(out);
        return out;
    }

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
