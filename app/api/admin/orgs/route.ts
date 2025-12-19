import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuthHeaders } from '@/lib/admin-proxy-auth';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
    const authHeaders = await getAdminAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(`${getBackendBaseUrl()}/api/admin/orgs`);
    const limit = request.nextUrl.searchParams.get('limit');
    const skip = request.nextUrl.searchParams.get('skip');
    const q = request.nextUrl.searchParams.get('q');
    if (limit) url.searchParams.set('limit', limit);
    if (skip) url.searchParams.set('skip', skip);
    if (q) url.searchParams.set('q', q);

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
    });

    const text = await res.text();
    let data: unknown = undefined;
    try {
        data = text ? JSON.parse(text) : undefined;
    } catch {
        data = text;
    }

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

    const orgIdFromBody = (body as any)?.orgId;
    if (typeof orgIdFromBody !== 'string' || !orgIdFromBody) {
        return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const res = await fetch(`${getBackendBaseUrl()}/api/admin/orgs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-ORG-ID': orgIdFromBody,
            ...authHeaders,
        },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: unknown = undefined;
    try {
        data = text ? JSON.parse(text) : undefined;
    } catch {
        data = text;
    }

    return NextResponse.json(data, { status: res.status });
}
