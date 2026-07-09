import { NextRequest, NextResponse } from 'next/server';
import { NarrativeEngine } from '../../../services/narrativeEngine';
import { getAuthPayload } from '../../auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthPayload(request);
    const { prompt, context } = await request.json();

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openRouterKey && !geminiKey) {
      console.error('[Brainstorm API] No AI API keys configured');
      return NextResponse.json({ error: 'AI API keys not configured' }, { status: 500 });
    }

    console.log('[Brainstorm API] Calling engine...');
    const engine = new NarrativeEngine(openRouterKey || '', geminiKey);
    const result = await engine.brainstorm(prompt, context);

    console.log('[Brainstorm API] Got result, returning...');
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[Brainstorm API] Caught error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ error: error.message || 'Brainstorm failed' }, { status: 500 });
  }
}
