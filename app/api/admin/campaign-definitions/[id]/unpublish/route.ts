import { NextResponse, type NextRequest } from 'next/server';
import { clearAdminSessionCookie, getAdminAuthHeaders } from '@/lib/admin-proxy-auth';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const authHeaders = await getAdminAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;

    const res = await fetch(`${getBackendBaseUrl()}/api/admin/campaign-definitions/${encodeURIComponent(id)}/unpublish`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
    });

    if (res.status === 401) {
        const out = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        clearAdminSessionCookie(out);
        return out;
    }

    const text = await res.text();
    let data: unknown = undefined;
    try {
        data = text ? JSON.parse(text) : undefined;
    } catch {
        data = text;
    }

    return NextResponse.json(data, { status: res.status });
}
