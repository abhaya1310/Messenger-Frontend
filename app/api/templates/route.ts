import { NextRequest, NextResponse } from 'next/server';

// Use BACKEND_URL if set (server-side only), otherwise fallback to NEXT_PUBLIC_BACKEND_URL
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    // Get limit from query params if provided
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    
    const url = new URL('/api/templates', BACKEND_URL);
    if (limit) {
      url.searchParams.append('limit', limit);
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = errorText.includes('WABA_ID') 
        ? 'WABA_ID is not configured on the backend. Please set WABA_ID in your backend environment variables.'
        : `Backend responded with ${response.status}: ${errorText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching templates:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to fetch templates';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('WABA_ID')) {
        errorMessage = 'WABA_ID configuration error';
        errorDetails = error.message;
      } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Backend connection failed';
        errorDetails = `Cannot reach backend at ${BACKEND_URL}. Please verify BACKEND_URL or NEXT_PUBLIC_BACKEND_URL is set correctly.`;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails,
        backendUrl: BACKEND_URL,
        hint: 'Check that WABA_ID is set in your backend environment variables and that the backend is accessible.'
      },
      { status: 500 }
    );
  }
}