import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ status: 'OK', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { status: 'FAIL', error: 'Health check failed' },
      { status: 500 }
    );
  }
}
