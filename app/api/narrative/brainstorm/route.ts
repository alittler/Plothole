import { NextRequest, NextResponse } from 'next/server';
import { NarrativeEngine } from '../../../services/narrativeEngine';
import { getAuthPayload } from '../../auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthPayload(request);
    const { prompt, context } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
    }

    const engine = new NarrativeEngine(apiKey);
    const result = await engine.brainstorm(prompt, context);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[Brainstorm API] Error:', error);
    return NextResponse.json({ error: error.message || 'Brainstorm failed' }, { status: 500 });
  }
}
