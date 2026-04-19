import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const version = process.env.npm_package_version || '0.0.0';
    return NextResponse.json({
      version,
      commit: process.env.NEXT_PUBLIC_GIT_COMMIT_HASH || 'unknown',
      name: 'Plothole',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Version endpoint failed' },
      { status: 500 }
    );
  }
}
