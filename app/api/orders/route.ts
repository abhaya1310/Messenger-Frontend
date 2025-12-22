import { NextResponse, type NextRequest } from 'next/server';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

function getUserAuthHeaders(request: NextRequest): Record<string, string> | null {
    const authorization = request.headers.get('authorization');
    if (!authorization) return null;

    const orgId = request.headers.get('x-org-id');

    return {
        Authorization: authorization,
        ...(orgId ? { 'X-ORG-ID': orgId } : {}),
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

function buildBackendUrl(pathname: string, request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const backendUrl = new URL(pathname, getBackendBaseUrl());
    backendUrl.searchParams.set('limit', '50');

    const outletId = searchParams.get('outletId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    if (outletId) backendUrl.searchParams.set('outletId', outletId);
    if (fromDate) backendUrl.searchParams.set('fromDate', fromDate);
    if (toDate) backendUrl.searchParams.set('toDate', toDate);

    return backendUrl;
}

export async function GET(request: NextRequest) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidatePaths = ['/api/orders', '/api/pos/orders', '/api/admin/orders'];

    for (const pathname of candidatePaths) {
        const backendUrl = buildBackendUrl(pathname, request);
        const res = await fetch(backendUrl.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
        });

        if (res.status === 404 || res.status === 405) {
            continue;
        }

        const data = await parseBackendResponse(res);
        return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(
        { error: 'Orders endpoint not found on backend. Tried: /api/orders, /api/pos/orders, /api/admin/orders' },
        { status: 502 }
    );
}
