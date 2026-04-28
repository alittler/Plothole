// @ts-ignore
import { split, getChunk } from 'llm-splitter';

export interface EntitySweepResult {
  potentialCharacters: string[];
  potentialEvents: string[];
}

export interface ChunkWithEntities {
  text: string;
  start: number;
  end: number;
  entities: EntitySweepResult;
}

export class PreProcessor {
  /**
   * Chunks text into paragraph-aware segments
   */
  static chunkText(text: string, chunkSize: number = 2000): ChunkWithEntities[] {
    // llm-splitter configuration for paragraph-aware word-based splitting
    const chunks = split(text, {
      chunkSize: chunkSize, 
      chunkStrategy: 'paragraph',
      // @ts-ignore
      splitter: (t: string) => t.split(/\s+/)
    });

    // Fallback if no chunks detected
    if (chunks.length === 0 && text.trim().length > 0) {
      return [{
        text: text,
        start: 0,
        end: text.length,
        entities: this.entitySweep(text)
      }];
    }

    return chunks.map((c: any) => {
      // getChunk expects (input, start, end)
      const chunkText = getChunk(text, c.start, c.end) as string;
      return {
        text: chunkText,
        start: c.start,
        end: c.end,
        entities: this.entitySweep(chunkText)
      };
    });
  }

  /**
   * Regex-based sweep for proper nouns and dates to reduce cloud noise
   */
  static entitySweep(text: string): EntitySweepResult {
    // Proper nouns: Capitalized words (Potential Characters)
    const properNounRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const foundNouns = text.match(properNounRegex) || [];
    const potentialCharacters = Array.from(new Set(foundNouns))
      .filter(name => name.length > 2); 

    // Date-like strings: Potential Events
    const dateRegex = /\b(?:\d{1,4}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,4}(?:st|nd|rd|th)?|(?:\d{4}s?)|(?:century|era|aged? \d+))\b/gi;
    const potentialEvents = Array.from(new Set(text.match(dateRegex) || []));

    return {
      potentialCharacters,
      potentialEvents
    };
  }
}
