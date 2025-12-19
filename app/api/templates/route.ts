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

    const url = new URL(`${getBackendBaseUrl()}/api/templates`);
    const limit = request.nextUrl.searchParams.get('limit');
    if (limit) url.searchParams.set('limit', limit);

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