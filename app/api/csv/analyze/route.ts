import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    if (!formData.get('file')) {
      return NextResponse.json({ error: 'file missing' }, { status: 400 });
    }
    
    // Reconstruct FormData for backend
    const backendFormData = new FormData();
    const file = formData.get('file') as File;
    const templateName = formData.get('templateName') as string;
    
    console.log('[csv-analyze-proxy]', {
      fileName: file?.name,
      fileSize: file?.size,
      templateName,
      hasAdminToken: !!process.env.ADMIN_TOKEN
    });
    
    backendFormData.append('file', file);
    if (templateName) {
      backendFormData.append('templateName', templateName);
    }
    
    const response = await fetch(`${BACKEND_URL}/api/csv/analyze`, {
      method: 'POST',
      headers: {
        'X-ADMIN-TOKEN': process.env.ADMIN_TOKEN || '',
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[csv-analyze-proxy] Backend error:', response.status, errorText);
      return NextResponse.json({ error: 'backend_error', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error analyzing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to analyze CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
