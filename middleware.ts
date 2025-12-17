import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from './lib/admin-session';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isAdminPage = pathname.startsWith('/admin');
    const isAdminApi = pathname.startsWith('/api/admin');

    if (!isAdminPage && !isAdminApi) {
        return NextResponse.next();
    }

    const isPublicAdminPage = pathname === '/admin/login';
    const isPublicAdminApi =
        pathname === '/api/admin/auth/login' || pathname === '/api/admin/auth/logout';

    if (isPublicAdminPage || isPublicAdminApi) {
        return NextResponse.next();
    }

    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
        return new NextResponse('ADMIN_SESSION_SECRET is not configured', { status: 500 });
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const verified = await verifyAdminSessionToken({ token, secret });

    if (!verified.ok) {
        if (isAdminApi) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};
