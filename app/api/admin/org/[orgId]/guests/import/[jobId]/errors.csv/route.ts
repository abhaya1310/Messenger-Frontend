import { NextResponse, type NextRequest } from "next/server";
import { clearAdminSessionCookie, getAdminAuthHeaders } from "@/lib/admin-proxy-auth";

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ orgId: string; jobId: string }> }) {
    const authHeaders = await getAdminAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, jobId } = await ctx.params;

    const res = await fetch(
        `${getBackendBaseUrl()}/api/admin/org/${encodeURIComponent(orgId)}/guests/import/${encodeURIComponent(jobId)}/errors.csv`,
        {
            method: "GET",
            headers: {
                ...authHeaders,
            },
        }
    );

    if (res.status === 401) {
        const out = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        clearAdminSessionCookie(out);
        return out;
    }

    const contentType = res.headers.get("content-type") || "text/csv";
    const contentDisposition = res.headers.get("content-disposition");

    return new NextResponse(res.body, {
        status: res.status,
        headers: {
            "Content-Type": contentType,
            ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
        },
    });
}
