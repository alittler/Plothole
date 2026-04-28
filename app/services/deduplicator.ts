import Fuse from 'fuse.js';
import { HierarchicalEntity } from '../types';

export interface EntityMatch {
  existing: HierarchicalEntity;
  fresh: any;
  score: number;
  reason: string;
}

export class Deduplicator {
  private characterFuse: Fuse<HierarchicalEntity>;
  private locationFuse: Fuse<HierarchicalEntity>;

  constructor(existingEntities: HierarchicalEntity[]) {
    const characters = existingEntities.filter(e => e.type === 'Character');
    const locations = existingEntities.filter(e => e.type === 'Location');

    this.characterFuse = new Fuse(characters, {
      keys: ['name', 'aliases', 'givenName', 'familyName', 'nickname'],
      threshold: 0.35,
      includeScore: true
    });

    this.locationFuse = new Fuse(locations, {
      keys: ['name', 'aliases'],
      threshold: 0.3,
      includeScore: true
    });
  }

  /**
   * Resolves a list of newly extracted entities against existing ones.
   * Returns a list of "Resolutions" which can be:
   * 1. Confirmed Match (High Confidence)
   * 2. Potential Match (Requires User Confirmation)
   * 3. New Entity
   */
  resolveEntities(freshEntities: any[]): { 
    matches: EntityMatch[], 
    newEntities: any[] 
  } {
    const matches: EntityMatch[] = [];
    const newEntities: any[] = [];

    for (const fresh of freshEntities) {
      if (!fresh.name) continue;

      let fuse = this.characterFuse;
      if (fresh.type === 'Location') fuse = this.locationFuse;
      
      const results = fuse.search(fresh.name);
      
      if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.5) {
        const bestMatch = results[0];
        matches.push({
          existing: bestMatch.item,
          fresh: fresh,
          score: bestMatch.score || 0,
          reason: `Fuzzy match: ${fresh.name} ~ ${bestMatch.item.name}`
        });
      } else {
        newEntities.push(fresh);
      }
    }

    return { matches, newEntities };
  }

  /**
   * Merges two entity objects, prioritizing existing data but filling gaps with fresh data.
   */
  static mergeEntities(existing: HierarchicalEntity, fresh: any): HierarchicalEntity {
    return {
      ...fresh, // Start with fresh to get new IDs/defaults
      ...existing, // Overwrite with existing to preserve manual edits
      // Smart merging for specific fields
      aliases: Array.from(new Set([...(existing.aliases || []), ...(fresh.aliases || [])])),
      traits: Array.from(new Set([...(existing.traits || []), ...(fresh.traits || [])])),
      description: existing.description || fresh.description,
      metadata: { ...(existing.metadata || {}), ...(fresh.metadata || {}) }
    };
  }
}
