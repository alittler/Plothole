import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../auth';

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Stubbing for now as we remove DB dependencies
  // In a full serverless setup, this might come from Vercel Postgres or Auth0 metadata
  return NextResponse.json({ username: null });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username } = await request.json();
    
    // For now, we don't have a persistent DB to save this to
    // In the future, this could be saved to Auth0 user metadata or a serverless DB
    return NextResponse.json({ success: true, username });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
