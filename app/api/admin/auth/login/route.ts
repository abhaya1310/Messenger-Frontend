import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken } from '@/lib/admin-session';

function getBackendBaseUrl(): string {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
    const usernameEnv = process.env.ADMIN_PORTAL_USERNAME;
    const passwordEnv = process.env.ADMIN_PORTAL_PASSWORD;
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret) {
        return NextResponse.json(
            { error: 'ADMIN_SESSION_SECRET is not configured' },
            { status: 500 }
        );
    }

    let body: { username?: string; password?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { username, password } = body;

    if (!username || !password) {
        return NextResponse.json(
            { error: 'username and password are required' },
            { status: 400 }
        );
    }

    if (usernameEnv && passwordEnv) {
        if (username !== usernameEnv || password !== passwordEnv) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
    }

    const identifier = username;
    const backendLoginBody = identifier.includes('@')
        ? { email: identifier, password }
        : { username: identifier, password };

    const backendRes = await fetch(`${getBackendBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendLoginBody),
    });

    const backendText = await backendRes.text();
    let backendData: unknown = undefined;
    try {
        backendData = backendText ? JSON.parse(backendText) : undefined;
    } catch {
        backendData = backendText;
    }

    if (!backendRes.ok) {
        return NextResponse.json(backendData, { status: backendRes.status });
    }

    const accessToken = (backendData as { accessToken?: unknown })?.accessToken;
    const expiresInSeconds = (backendData as { expiresInSeconds?: unknown })?.expiresInSeconds;

    if (typeof accessToken !== 'string' || !accessToken) {
        return NextResponse.json({ error: 'Backend login did not return accessToken' }, { status: 502 });
    }

    const expiresIn = typeof expiresInSeconds === 'number' ? expiresInSeconds : Number(expiresInSeconds);
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
        return NextResponse.json({ error: 'Backend login returned invalid expiresInSeconds' }, { status: 502 });
    }

    const token = await createAdminSessionToken({
        secret,
        accessToken,
        expiresInSeconds: expiresIn,
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: expiresIn,
    });

    return res;
}
