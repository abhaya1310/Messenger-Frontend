import { NextResponse, type NextRequest } from 'next/server';
import { clearAdminSessionCookie, getAdminAuthHeaders } from '@/lib/admin-proxy-auth';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
    const authHeaders = await getAdminAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const orgIdFromBody = (body as any)?.orgId;
    const orgIdHeader =
        typeof orgIdFromBody === 'string' && orgIdFromBody
            ? orgIdFromBody
            : process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || 'default';

    const res = await fetch(`${getBackendBaseUrl()}/api/admin/orgs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-ORG-ID': orgIdHeader,
            ...authHeaders,
        },
        body: JSON.stringify(body),
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
