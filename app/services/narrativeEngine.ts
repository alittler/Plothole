import { Deduplicator } from './deduplicator';
import { HierarchicalEntity } from '../types';
import { NarrativeExtractionSchema } from './schemas';
import { generateId } from './storageService';
import { safeJsonParse } from '../../src/utils/jsonUtils';

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

  async recursiveExtraction(
    manuscript: string,
    chunks: { text: string; start: number; end: number }[], 
    schemaOrPrompt: ExtractionSchema | string,
    existingEntities: HierarchicalEntity[] = []
  ) {
    let worldState: HierarchicalEntity[] = [...existingEntities];

    console.log(`[NarrativeEngine] Starting OpenRouter extraction for ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[NarrativeEngine] Processing chunk ${i + 1}/${chunks.length} (${chunk.text.length} chars)...`);

      // Re-initialize deduplicator each loop with current state
      const deduplicator = new Deduplicator(worldState);

      const extracted = await this.extractFromChunk(chunk.text, schemaOrPrompt);
      console.log(`[NarrativeEngine] Chunk ${i + 1} extracted:`, {
        characters: extracted.characters?.length || 0,
        locations: extracted.locations?.length || 0,
        events: extracted.events?.length || 0,
        plotPoints: extracted.plotPoints?.length || 0
      });
      
      // Ensure each extracted entity has basic required fields for the deduplicator
      const freshEntities = [
        ...(extracted.characters || []).map((c: any) => ({ ...c, type: 'Character' })),
        ...(extracted.locations || []).map((l: any) => ({ ...l, type: 'Location' })),
        ...(extracted.events || []).map((e: any) => ({ ...e, type: 'Event' })),
        ...(extracted.plotPoints || []).map((p: any) => ({ ...p, type: 'PlotPoint' }))
      ];

      const { matches, newEntities } = deduplicator.resolveEntities(freshEntities);

      // Handle Matches
      for (const match of matches) {
        const merged = Deduplicator.mergeEntities(match.existing, match.fresh);
        const index = worldState.findIndex(e => e.id === match.existing.id);
        if (index !== -1) {
          worldState[index] = merged;
        }
      }

      // Handle New Entities - Assign IDs immediately
      const entitiesWithIds = newEntities.map(e => ({
        id: generateId(),
        ...e
      }));

      worldState.push(...entitiesWithIds);
      console.log(`[NarrativeEngine] After chunk ${i + 1}: worldState has ${worldState.length} entities`);
    }

    console.log(`[NarrativeEngine] Completed. Total entities in state: ${worldState.length}`);
    if (worldState.length === 0) {
      console.warn('[NarrativeEngine] WARNING: No entities extracted! This may indicate an API failure or empty manuscript.');
    }
    return worldState;
  }

  private async extractFromChunk(chunkText: string, schemaOrPrompt: any) {
    try {
      const isCustomPrompt = typeof schemaOrPrompt === 'string';
      console.log('[NarrativeEngine] isCustomPrompt:', isCustomPrompt, 'schemaOrPrompt type:', typeof schemaOrPrompt);
      if (isCustomPrompt) {
        console.log('[NarrativeEngine] Custom prompt (first 200 chars):', (schemaOrPrompt as string).substring(0, 200));
      }
      const systemInstruction = isCustomPrompt 
        ? `${schemaOrPrompt}\n\nIMPORTANT: Return ONLY a valid JSON object. Use keys "characters", "locations", and "events" (or "plotPoints") for the extracted data.`
        : `You are an expert narrative architect. Extract characters, locations, and events from the provided text.\nReturn ONLY a valid JSON object matching this schema:\n${JSON.stringify(schemaOrPrompt, null, 2)}`;

      console.log('[NarrativeEngine] Sending request to OpenRouter...');
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://plothole.click', 
          'X-Title': 'Plothole Narrative Processor',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001', 
          messages: [
            {
              role: 'system',
              content: systemInstruction
            },
            {
              role: 'user',
              content: `Analyze this story segment: \n\n ${chunkText}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      console.log('[NarrativeEngine] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[NarrativeEngine] OpenRouter API Error Response:', errorText);
        throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('[NarrativeEngine] Received response from OpenRouter');
      console.log('[NarrativeEngine] Response structure - choices:', Array.isArray(data?.choices), 'length:', data?.choices?.length);
      
      if (!data?.choices?.[0]?.message?.content) {
        console.error('[NarrativeEngine] Invalid response structure:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response structure from OpenRouter: no content in choices[0].message');
      }

      let content = data.choices[0].message.content;
      console.log('[NarrativeEngine] Raw response content:', content.substring(0, 500));

      const parsed = safeJsonParse(content);
      if (!parsed) {
        console.error('[NarrativeEngine] Failed to parse content as JSON:', content);
        throw new Error('Failed to parse AI response as JSON.');
      }
      console.log('[NarrativeEngine] Parsed JSON keys:', Object.keys(parsed).join(', '));      
      // Helper to ensure array
      const ensureArray = (val: any): any[] => Array.isArray(val) ? val : [];
      
      // Normalize keys for custom prompts (case-insensitive and common aliases)
      const characterized = ensureArray(parsed.characters || parsed.Characters || parsed.people || parsed.People || parsed.cast);
      const normalized: any = {
        characters: characterized.map((c: any) => ({
          name: c.name || c.Name || c.character_name || 'Unknown',
          aliases: ensureArray(c.aliases || c.Aliases),
          role: c.role || c.Role || null,
          job: c.job || c.Job || null,
          tier: c.tier || c.Tier || 2,
          traits: ensureArray(c.traits || c.Traits),
          primary_trait: c.primary_trait || c.PrimaryTrait || c.primaryTrait || null,
          strengths: c.strengths || c.Strengths || null,
          weaknesses: c.weaknesses || c.Weaknesses || null,
          motivation: c.motivation || c.Motivation || c.motive || null,
          conflict: c.conflict || c.Conflict || c.internal_conflict || null,
          description: c.description || c.Description || null,
          physical_description: c.physical_description || c.physicalDescription || c.PhysicalDescription || null,
          species: c.species || c.Species || null,
          gender: c.gender || c.Gender || null,
          age: c.age || c.Age || null,
          affiliation: c.affiliation || c.Affiliation || null,
          style: c.style || c.Style || null,
          type: 'Character'
        })),
        locations: ensureArray(parsed.locations || parsed.Locations || parsed.places || parsed.Places || parsed.settings).map((l: any) => ({
          name: l.name || l.Name || l.location_name || 'Unknown',
          description: l.description || l.Description || null,
          locationType: l.type || l.Type || l.location_type || 'other',
          type: 'Location'
        })),
        events: ensureArray(parsed.timeline_events || parsed.events || parsed.Events || parsed.timeline || parsed.Timeline || parsed.history).map((e: any) => ({
          name: e.name || e.Name || e.title || e.Title || e.event_name || 'Unknown',
          description: e.description || e.Description || null,
          startDate: e.startDate || e.StartDate || e.date || e.Date || e.timeline || e.Timeline || null,
          charactersInvolved: ensureArray(e.charactersInvolved || e.CharactersInvolved || e.participants || e.Participants || e.characters || e.Characters),
          type: 'Event',
          event_type: e.event_type || e.EventType || null,
          significance: e.significance || e.Significance || null
        })),
        plotPoints: ensureArray(parsed.plotPoints || parsed.plot_points || parsed.PlotPoints || parsed.plot).map((p: any) => ({
          title: p.title || p.Title || p.plot_point || p.PlotPoint || 'Unknown',
          summary: p.summary || p.Summary || null,
          timeline: p.timeline || p.Timeline || null
        }))
      };

      console.log('[NarrativeEngine] Successfully parsed chunk. Characters:', normalized.characters?.length, 'Locations:', normalized.locations?.length, 'Events:', normalized.events?.length, 'PlotPoints:', normalized.plotPoints?.length);
      return NarrativeExtractionSchema.parse(normalized);
    } catch (error: any) {
      console.error('[NarrativeEngine] Extraction failed for chunk.');
      console.error('[NarrativeEngine] Error type:', error?.constructor?.name);
      console.error('[NarrativeEngine] Error message:', error?.message);
      if (error instanceof Error) {
        console.error('[NarrativeEngine] Error Details:', error.message);
        console.error('[NarrativeEngine] Stack trace:', error.stack);
      }
      if (error.response) {
        console.error('[NarrativeEngine] Response Status:', error.response.status);
        console.error('[NarrativeEngine] Response Body:', error.response.body);
      }
      console.error('[NarrativeEngine] Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return { characters: [], locations: [], events: [], plotPoints: [] };
    }
  }

  async detectWorldType(manuscript: string): Promise<'real' | 'fictional' | 'mixed'> {
    try {
      console.log('[NarrativeEngine] Detecting world type from manuscript...');
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://plothole.click',
          'X-Title': 'Plothole Narrative Processor',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content: `You are a story analyst. Determine if this story is set in the real world, a fictional world, or a mix of both.

Return ONLY a JSON object with one field:
{
  "worldType": "real" | "fictional" | "mixed",
  "reasoning": "brief explanation"
}

Guidelines:
- "real": Story is set in the real world (historical, contemporary, etc.) using actual places and events
- "fictional": Story is set in an invented/fantasy world with fictional locations
- "mixed": Story blends real world locations/events with fictional elements or multiple worlds`
            },
            {
              role: 'user',
              content: `Analyze this story (first 2000 chars): ${manuscript.substring(0, 2000)}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[NarrativeEngine] WorldType Detection Error:', errorText);
        return 'fictional'; // Default to fictional on error
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.warn('[NarrativeEngine] No content in worldType response');
        return 'fictional';
      }

      const parsed = JSON.parse(content);
      const worldType = parsed.worldType?.toLowerCase() || 'fictional';
      
      if (!['real', 'fictional', 'mixed'].includes(worldType)) {
        console.warn('[NarrativeEngine] Invalid worldType:', worldType);
        return 'fictional';
      }

      console.log('[NarrativeEngine] Detected world type:', worldType, 'Reasoning:', parsed.reasoning);
      return worldType as 'real' | 'fictional' | 'mixed';
    } catch (error: any) {
      console.error('[NarrativeEngine] Error detecting world type:', error.message);
      return 'fictional'; // Safe default
    }
  }

  async brainstorm(prompt: string, context: string): Promise<string> {
    try {
      console.log('[NarrativeEngine] Starting brainstorm...');
      console.log('[NarrativeEngine] API Base URL:', this.baseUrl);
      console.log('[NarrativeEngine] Using model: google/gemini-2.0-flash-001');
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://plothole.click',
          'X-Title': 'Plothole Brainstorm',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: context
            }
          ]
        })
      });

      console.log('[NarrativeEngine] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[NarrativeEngine] API Error Response:', errorText);
        throw new Error(`Brainstorm API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('[NarrativeEngine] Response received:', { 
        choices: data.choices?.length,
        hasContent: !!data.choices?.[0]?.message?.content 
      });
      
      return data.choices?.[0]?.message?.content || "I couldn't generate any connections at this time.";
    } catch (error: any) {
      console.error('[NarrativeEngine] Brainstorm failed:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      // Return error message with more detail in development
      const errorDetail = process.env.NODE_ENV === 'development' 
        ? ` (${error.message})`
        : '';
      return `I'm sorry, my creative centers are offline. Please try again later.${errorDetail}`;
    }
  }
}
