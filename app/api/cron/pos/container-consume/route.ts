import { NextResponse, type NextRequest } from 'next/server';

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

export async function POST(request: NextRequest) {
    const cronSecret = request.headers.get('x-cron-secret');
    if (!cronSecret) {
        return NextResponse.json({ error: 'Missing X-CRON-SECRET header' }, { status: 401 });
    }

    const res = await fetch(`${getBackendBaseUrl()}/api/cron/pos/container-consume`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CRON-SECRET': cronSecret,
        },
    });

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
