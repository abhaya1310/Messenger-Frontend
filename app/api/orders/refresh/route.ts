import { NextResponse, type NextRequest } from 'next/server';

export async function POST(_request: NextRequest) {
    return NextResponse.json(
        { error: 'Not Found' },
        {
            status: 404,
        }
    );
}
