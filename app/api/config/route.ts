import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
    const hasDb = !!(process.env.DATABASE_URL);
    const hasAuth0 = !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID);

    return NextResponse.json({
      hasGeminiKey,
      hasDb,
      hasAuth0,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Config endpoint failed' },
      { status: 500 }
    );
  }
}
