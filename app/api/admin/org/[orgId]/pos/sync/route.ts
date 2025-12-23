import { NextResponse, type NextRequest } from 'next/server';
import { clearAdminSessionCookie, getAdminAuthHeaders } from '@/lib/admin-proxy-auth';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

function getCronSecret(): string | undefined {
    return process.env.POS_CONTAINER_CRON_SECRET || process.env.CRON_SECRET || process.env.X_CRON_SECRET;
}

async function parseBackendResponse(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const authHeaders = await getAdminAuthHeaders(request);
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

    const { orgId } = await ctx.params;

    const res = await fetch(`${getBackendBaseUrl()}/api/cron/pos/container-consume`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CRON-SECRET': cronSecret,
            'X-ORG-ID': orgId,
        },
        body: JSON.stringify({}),
    });

    if (res.status === 401) {
        const out = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        clearAdminSessionCookie(out);
        return out;
    }

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
