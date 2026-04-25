import { NextRequest, NextResponse } from 'next/server';
import { NarrativeEngine } from '../../../services/narrativeEngine';
import { getAuthPayload } from '../../auth';
import { PreProcessor } from '../../../services/preProcessor';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthPayload(request);
    const { manuscriptText, existingEntities, chunkSize } = await request.json();

    if (!manuscriptText) {
      return NextResponse.json({ error: 'Manuscript text is required' }, { status: 400 });
    }

    // Prioritize OpenRouter as requested
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured on server' }, { status: 500 });
    }

    const engine = new NarrativeEngine(apiKey);

    // Step 1: Pre-Processor (Local to server)
    const processedChunks = PreProcessor.chunkText(manuscriptText, chunkSize || 2000);

    const schema = {
      characters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            traits: { type: 'array', items: { type: 'string' } },
            motivation: { type: 'string' },
            description: { type: 'string' },
            aliases: { type: 'array', items: { type: 'string' } },
            type: { type: 'string', enum: ['Character'] }
          }
        }
      },
      locations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['Location'] }
          }
        }
      },
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            startDate: { type: 'string' },
            type: { type: 'string', enum: ['Event'] }
          }
        }
      }
    };

    const worldState = await engine.recursiveExtraction(
      manuscriptText,
      processedChunks, 
      schema, 
      existingEntities || []
    );

    return NextResponse.json({ 
      worldState,
      chunksCount: processedChunks.length
    });

  } catch (error: any) {
    console.error('[Narrative API] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Analysis failed' 
    }, { status: 500 });
  }
}
