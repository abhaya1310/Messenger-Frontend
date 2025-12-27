import { NextResponse, type NextRequest } from 'next/server';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

let cachedOrdersPath: string | null = null;

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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

export async function GET(request: NextRequest) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidatePaths = cachedOrdersPath ? [cachedOrdersPath, '/api/orders', '/api/v1/orders'] : ['/api/orders', '/api/v1/orders'];
    const uniqCandidatePaths = Array.from(new Set(candidatePaths));

    for (const pathname of uniqCandidatePaths) {
        const backendUrl = buildBackendUrl(pathname, request);
        let res: Response;
        try {
            res = await fetchWithTimeout(
                backendUrl.toString(),
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders,
                    },
                },
                15000
            );
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to reach backend';
            return NextResponse.json({ error: msg }, { status: 504 });
        }

        if (res.status === 404 || res.status === 405) {
            if (cachedOrdersPath === pathname) cachedOrdersPath = null;
            continue;
        }

        cachedOrdersPath = pathname;
        const data = await parseBackendResponse(res);
        return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(
        { error: 'Orders endpoint not found on backend. Tried: /api/orders, /api/v1/orders' },
        { status: 502 }
    );
}
