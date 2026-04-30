import { NextRequest, NextResponse } from 'next/server';
import { NarrativeEngine } from '../../../services/narrativeEngine';
import { getAuthPayload } from '../../auth';
import { PreProcessor } from '../../../services/preProcessor';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthPayload(request);
    const { manuscriptText, existingEntities, chunkSize, customPrompt } = await request.json();

    console.log(`[Narrative API] Received analysis request. Text length: ${manuscriptText?.length || 0}`);
    console.log(`[Narrative API] Custom prompt received:`, customPrompt ? `Yes (${customPrompt.length} chars)` : 'No');
    if (customPrompt) {
      console.log(`[Narrative API] Custom prompt (first 100 chars):`, customPrompt.substring(0, 100));
    }

    if (!manuscriptText) {
      return NextResponse.json({ error: 'Manuscript text is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[Narrative API] OPENROUTER_API_KEY is missing');
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured on server' }, { status: 500 });
    }

    const engine = new NarrativeEngine(apiKey);

    // Step 1: Pre-Processor 
    const targetChunkSize = chunkSize || 5000;
    const processedChunks = PreProcessor.chunkText(manuscriptText, targetChunkSize);
    
    console.log(`[Narrative API] Split manuscript into ${processedChunks.length} chunks (target size: ${targetChunkSize})`);

    // Use custom prompt if provided, otherwise use the default schema-based approach
    const analysisSchemaOrPrompt = customPrompt || {
      characters: [
        {
          name: "string",
          aliases: ["string"],
          role: "string",
          job: "string",
          tier: 1,
          traits: ["string"],
          primary_trait: "string",
          strengths: "string",
          weaknesses: "string",
          motivation: "string",
          conflict: "string",
          description: "string",
          physical_description: "string",
          species: "string",
          gender: "string",
          age: "string",
          affiliation: "string",
          style: "string",
          type: "Character"
        }
      ],
      locations: [
        {
          name: "string",
          description: "string",
          type: "Location"
        }
      ],
      events: [
        {
          name: "string",
          description: "string",
          startDate: "string",
          charactersInvolved: ["string"],
          type: "Event"
        }
      ]
    };

    const worldState = await engine.recursiveExtraction(
      manuscriptText,
      processedChunks, 
      analysisSchemaOrPrompt, 
      existingEntities || []
    );

    // Detect world type
    const worldType = await engine.detectWorldType(manuscriptText);

    console.log(`[Narrative API] Extraction complete. Found ${worldState.length} total entities. World type: ${worldType}`);

    return NextResponse.json({ 
      worldState,
      chunksCount: processedChunks.length,
      worldType
    });

  } catch (error: any) {
    console.error('[Narrative API] Critical Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Analysis failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
