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

function withProxyHeaders(response: NextResponse, params: { backendUrl: string; backendStatus: number }) {
    response.headers.set('x-proxy-backend-url', params.backendUrl);
    response.headers.set('x-proxy-backend-status', String(params.backendStatus));
    response.headers.set('x-proxy-route', '/api/admin/feedback-definitions');
    return response;
}

export async function GET(request: NextRequest) {
    const authHeaders = await getAdminAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.toString();
    const backendUrl = `${getBackendBaseUrl()}/api/admin/feedback-definitions${query ? `?${query}` : ''}`;

    let res: Response;
    try {
        res = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
        });
    } catch (e) {
        return withProxyHeaders(
            NextResponse.json(
                {
                    error: 'Bad Gateway',
                    message: e instanceof Error ? e.message : 'Failed to reach backend',
                    backendUrl,
                },
                { status: 502 }
            ),
            { backendUrl, backendStatus: 0 }
        );
    }

    if (res.status === 401) {
        const out = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        clearAdminSessionCookie(out);
        return withProxyHeaders(out, { backendUrl, backendStatus: res.status });
    }

    const data = await parseBackendResponse(res);
    if (res.status === 404) {
        return withProxyHeaders(
            NextResponse.json(
                {
                    error: 'Not Found',
                    message: 'Backend route not found',
                    backendUrl,
                    backendStatus: res.status,
                    backendResponse: data,
                },
                { status: 404 }
            ),
            { backendUrl, backendStatus: res.status }
        );
    }

    return withProxyHeaders(NextResponse.json(data, { status: res.status }), { backendUrl, backendStatus: res.status });
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

    const backendUrl = `${getBackendBaseUrl()}/api/admin/feedback-definitions`;
    let res: Response;
    try {
        res = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
            body: JSON.stringify(body),
        });
    } catch (e) {
        return withProxyHeaders(
            NextResponse.json(
                {
                    error: 'Bad Gateway',
                    message: e instanceof Error ? e.message : 'Failed to reach backend',
                    backendUrl,
                },
                { status: 502 }
            ),
            { backendUrl, backendStatus: 0 }
        );
    }

    if (res.status === 401) {
        const out = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        clearAdminSessionCookie(out);
        return withProxyHeaders(out, { backendUrl, backendStatus: res.status });
    }

    const data = await parseBackendResponse(res);
    if (res.status === 404) {
        return withProxyHeaders(
            NextResponse.json(
                {
                    error: 'Not Found',
                    message: 'Backend route not found',
                    backendUrl,
                    backendStatus: res.status,
                    backendResponse: data,
                },
                { status: 404 }
            ),
            { backendUrl, backendStatus: res.status }
        );
    }

    return withProxyHeaders(NextResponse.json(data, { status: res.status }), { backendUrl, backendStatus: res.status });
}
