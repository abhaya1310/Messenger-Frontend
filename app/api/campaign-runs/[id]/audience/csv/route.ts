import { NextResponse, type NextRequest } from 'next/server';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

function getUserAuthHeaders(request: NextRequest): Record<string, string> | null {
    const authorization = request.headers.get('authorization');
    if (!authorization) return null;
    return { Authorization: authorization };
}

async function parseBackendResponse(res: Response) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const authHeaders = getUserAuthHeaders(request);
    if (!authHeaders) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 });
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const outForm = new FormData();
    outForm.append('file', file, file.name);

    const res = await fetch(`${getBackendBaseUrl()}/api/campaign-runs/${encodeURIComponent(id)}/audience/csv`, {
        method: 'POST',
        headers: {
            ...authHeaders,
        },
        body: outForm,
    });

    const data = await parseBackendResponse(res);
    return NextResponse.json(data, { status: res.status });
}
