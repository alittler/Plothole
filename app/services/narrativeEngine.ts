import { Deduplicator } from './deduplicator';
import { HierarchicalEntity } from '../types';
import { NarrativeExtractionSchema } from './schemas';

export interface ExtractionSchema {
  characters: any;
  locations: any;
  events: any;
}

export class NarrativeEngine {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Recursive Extraction loop using OpenRouter
   * Since OpenRouter doesn't support Gemini Caching, we must send 
   * a focused context with each chunk.
   */
  async recursiveExtraction(
    manuscript: string,
    chunks: { text: string; start: number; end: number }[], 
    schema: ExtractionSchema,
    existingEntities: HierarchicalEntity[] = []
  ) {
    let worldState: HierarchicalEntity[] = [...existingEntities];
    const deduplicator = new Deduplicator(worldState);

    console.log(`[NarrativeEngine] Starting OpenRouter extraction for ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[NarrativeEngine] Processing chunk ${i + 1}/${chunks.length} via OpenRouter...`);

      // We send the chunk + a brief summary of the world so far to help with continuity
      const extracted = await this.extractFromChunk(chunk.text, schema);
      
      const { matches, newEntities } = deduplicator.resolveEntities([
        ...(extracted.characters || []),
        ...(extracted.locations || []),
        ...(extracted.events || [])
      ]);

      for (const match of matches) {
        const merged = Deduplicator.mergeEntities(match.existing, match.fresh);
        const index = worldState.findIndex(e => e.id === match.existing.id);
        if (index !== -1) {
          worldState[index] = merged;
        }
      }

      worldState.push(...newEntities);
    }

    return worldState;
  }

  private async extractFromChunk(chunkText: string, schema: any) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://plothole.click', // Required by OpenRouter
          'X-Title': 'Plothole Narrative Processor',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-pro-1.5', // OpenRouter model string
          messages: [
            {
              role: 'system',
              content: `You are an expert narrative architect. Extract characters, locations, and events.
              Format your response as valid JSON matching this schema:
              ${JSON.stringify(schema, null, 2)}`
            },
            {
              role: 'user',
              content: `Analyze this story segment: \n\n ${chunkText}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter Error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return NarrativeExtractionSchema.parse(JSON.parse(content));
    } catch (error: any) {
      console.error('[NarrativeEngine] OpenRouter extraction failed:', error.message || error);
      return { characters: [], locations: [], events: [] };
    }
  }
}
