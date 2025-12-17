import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/admin-session';

export async function getAdminAuthHeaders(request: NextRequest): Promise<Record<string, string> | null> {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
        return null;
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const verified = await verifyAdminSessionToken({ token, secret });
    if (!verified.ok) {
        return null;
    }

    return { Authorization: `Bearer ${verified.payload.accessToken}` };
}

export function clearAdminSessionCookie(res: NextResponse) {
    res.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
}
