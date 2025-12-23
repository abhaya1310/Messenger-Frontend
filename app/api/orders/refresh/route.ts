import { NextResponse, type NextRequest } from 'next/server';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

function getCronSecret(): string | undefined {
    return process.env.POS_CONTAINER_CRON_SECRET || process.env.CRON_SECRET || process.env.X_CRON_SECRET;
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

export async function POST(request: NextRequest) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cronSecret = getCronSecret();
    if (!cronSecret) {
        return NextResponse.json(
            { error: 'Cron secret is not configured (set POS_CONTAINER_CRON_SECRET or CRON_SECRET)' },
            { status: 500 }
        );
    }

    const orgId = request.headers.get('x-org-id');

    const res = await fetch(`${getBackendBaseUrl()}/api/cron/pos/container-consume`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CRON-SECRET': cronSecret,
            ...(orgId ? { 'X-ORG-ID': orgId } : {}),
        },
        body: JSON.stringify({}),
    });

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
