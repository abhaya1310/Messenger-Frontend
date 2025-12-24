import { NextResponse, type NextRequest } from 'next/server';
import { clearAdminSessionCookie, getAdminAuthHeaders } from '@/lib/admin-proxy-auth';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

async function parseBackendResponse(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

export async function GET(request: NextRequest) {
    const authHeaders = await getAdminAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.toString();
    const backendUrl = `${getBackendBaseUrl()}/api/admin/feedback-definitions${query ? `?${query}` : ''}`;

    const res = await fetch(backendUrl, {
        method: 'GET',
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

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
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

    const res = await fetch(`${getBackendBaseUrl()}/api/admin/feedback-definitions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        const out = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        clearAdminSessionCookie(out);
        return out;
    }

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
