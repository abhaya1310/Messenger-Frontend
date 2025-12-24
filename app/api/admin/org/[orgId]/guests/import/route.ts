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

export async function POST(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const authHeaders = await getAdminAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await ctx.params;

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Invalid multipart/form-data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const forwardForm = new FormData();
    forwardForm.set("file", file, file.name);

    const res = await fetch(`${getBackendBaseUrl()}/api/admin/org/${encodeURIComponent(orgId)}/guests/import`, {
        method: "POST",
        headers: {
            ...authHeaders,
        },
        body: forwardForm,
    });

    if (res.status === 401) {
        const out = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        clearAdminSessionCookie(out);
        return out;
    }

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
