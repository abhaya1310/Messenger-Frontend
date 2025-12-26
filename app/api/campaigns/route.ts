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

export async function GET(request: NextRequest) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.toString();
    const backendUrl = `${getBackendBaseUrl()}/api/campaigns${query ? `?${query}` : ''}`;

    const res = await fetch(backendUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
    });

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const res = await fetch(`${getBackendBaseUrl()}/api/campaigns`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
        body: JSON.stringify(body),
    });

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
