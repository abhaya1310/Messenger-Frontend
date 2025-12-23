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

function buildBackendUrl(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const backendUrl = new URL('/api/segments', getBackendBaseUrl());

    const limit = searchParams.get('limit') || '50';
    const skip = searchParams.get('skip') || '0';
    backendUrl.searchParams.set('limit', limit);
    backendUrl.searchParams.set('skip', skip);

    return backendUrl;
}

export async function GET(request: NextRequest) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const res = await fetch(buildBackendUrl(request).toString(), {
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
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const bodyText = await request.text();

    const res = await fetch(`${getBackendBaseUrl()}/api/segments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
        body: bodyText,
    });

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
