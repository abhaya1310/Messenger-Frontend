import { NextResponse, type NextRequest } from 'next/server';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

function getUserAuthHeaders(request: NextRequest): Record<string, string> | null {
    const authorization = request.headers.get('authorization');
    if (!authorization) return null;

    return {
        Authorization: authorization,
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

    const limit = searchParams.get('limit') || '50';
    backendUrl.searchParams.set('limit', limit);

    const cursor = searchParams.get('cursor');
    if (cursor) backendUrl.searchParams.set('cursor', cursor);

    return backendUrl;
}

export async function GET(request: NextRequest) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidatePaths = ['/api/orders', '/api/v1/orders'];

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
        { error: 'Orders endpoint not found on backend. Tried: /api/orders, /api/v1/orders' },
        { status: 502 }
    );
}
