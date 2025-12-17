import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from './lib/admin-session';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isAdminApi = pathname.startsWith('/api/admin');

    if (!isAdminApi) {
        return NextResponse.next();
    }

    const isPublicAdminApi =
        pathname === '/api/admin/auth/login' || pathname === '/api/admin/auth/logout';

    if (isPublicAdminApi) {
        return NextResponse.next();
    }

    const authorization = request.headers.get('authorization');
    if (authorization) {
        return NextResponse.next();
    }

    const adminToken = request.headers.get('x-admin-token');
    if (adminToken) {
        return NextResponse.next();
    }

    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
        return new NextResponse('ADMIN_SESSION_SECRET is not configured', { status: 500 });
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const verified = await verifyAdminSessionToken({ token, secret });

    if (!verified.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/admin/:path*'],
};
