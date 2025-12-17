import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const authorization = request.headers.get('authorization');
    const orgId = request.headers.get('x-org-id');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/feedback/preview`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        ...(orgId ? { 'X-ORG-ID': orgId } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error previewing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to preview feedback' },
      { status: 500 }
    );
  }
}
