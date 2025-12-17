import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-session';

export async function POST(_request: NextRequest) {
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    return res;
}
