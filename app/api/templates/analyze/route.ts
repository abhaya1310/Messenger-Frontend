import { NextRequest, NextResponse } from 'next/server';

// Use BACKEND_URL if set (server-side only), otherwise fallback to NEXT_PUBLIC_BACKEND_URL
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const authorization = request.headers.get('authorization');
    const orgId = request.headers.get('x-org-id');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const response = await fetch(`${BACKEND_URL}/api/templates/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        ...(orgId ? { 'X-ORG-ID': orgId } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error analyzing template:', error);
    return NextResponse.json(
      { error: 'Failed to analyze template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
