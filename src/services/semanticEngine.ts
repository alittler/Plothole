import { ProjectData } from '../types';

export interface ManifestRange {
  start: number;
  end: number;
  originalText: string;
  status: 'active' | 'awaiting-review';
}

export interface ManifestEntry {
  id: string;
  offset: number;
  fingerprint: string;
  status: 'active' | 'awaiting-review';
  ranges?: Record<string, ManifestRange>; // key is "start-end"
}

export interface DiffLogEntry {
  id: string;
  timestamp: number;
  change: string;
}

export interface SemanticMetadata {
  manifest: ManifestEntry[];
  diffLog: DiffLogEntry[];
  hash: string;
}

export class SemanticEngine {
  private static METADATA_DELIMITER = '\n\n===METADATA===\n';

  /**
   * Generates a SHA256 hash of the string
   */
  private static async generateHash(text: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Extracts a 10-word fingerprint preceding the anchor
   */
  private static getFingerprint(text: string, offset: number): string {
    const precedingText = text.substring(0, offset).trim();
    const words = precedingText.split(/\s+/);
    return words.slice(-10).join(' ');
  }

  /**
   * Scans prose for anchors and builds a manifest
   */
  public static async buildMetadata(prose: string, existingMetadata?: SemanticMetadata): Promise<SemanticMetadata> {
    const manifest: ManifestEntry[] = [];
    const anchorRegex = /\^([a-zA-Z0-9-]+)(?::(\d+)-(\d+))?/g;
    let match;

    while ((match = anchorRegex.exec(prose)) !== null) {
      const id = match[1];
      const offset = match.index;
      const rangeStart = match[2];
      const rangeEnd = match[3];

      let entry = manifest.find(e => e.id === id);
      if (!entry) {
        entry = {
          id,
          offset,
          fingerprint: this.getFingerprint(prose, offset),
          status: 'active',
          ranges: {}
        };
        manifest.push(entry);
      }

      if (rangeStart && rangeEnd) {
        const start = parseInt(rangeStart);
        const end = parseInt(rangeEnd);
        const blockStart = prose.lastIndexOf('\n\n', offset) + 2;
        const originalText = prose.substring(blockStart + start, blockStart + end);
        
        if (entry.ranges) {
          entry.ranges[`${start}-${end}`] = {
            start,
            end,
            originalText,
            status: 'active'
          };
        }
      }
    }

    const hash = await this.generateHash(prose);
    
    return {
      manifest,
      diffLog: existingMetadata?.diffLog || [],
      hash
    };
  }

  /**
   * Performs fuzzy reconciliation on a document
   */
  public static async heal(fullText: string): Promise<string> {
    const parts = fullText.split(this.METADATA_DELIMITER);
    let prose = parts[0];
    let metadataStr = parts[1];
    
    let metadata: SemanticMetadata | null = null;
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        console.error("Failed to parse metadata, rebuilding...", e);
      }
    }

    if (!metadata) {
      const newMetadata = await this.buildMetadata(prose);
      return prose + this.METADATA_DELIMITER + JSON.stringify(newMetadata, null, 2);
    }

    // Healing Logic
    const newManifest: ManifestEntry[] = [];
    const diffLog = [...(metadata.diffLog || [])];

    for (const entry of metadata.manifest) {
      const anchor = `^${entry.id}`;
      let currentEntry = { ...entry };
      let found = false;
      
      // 1. Check exact offset
      if (prose.substring(entry.offset, entry.offset + anchor.length) === anchor) {
        found = true;
      } else {
        // 2. Search vicinity for fingerprint
        const vicinityStart = Math.max(0, entry.offset - 500);
        const vicinityEnd = Math.min(prose.length, entry.offset + 500);
        const vicinity = prose.substring(vicinityStart, vicinityEnd);
        
        const fingerprintIndex = vicinity.indexOf(entry.fingerprint);
        if (fingerprintIndex !== -1) {
          const potentialOffset = vicinityStart + fingerprintIndex + entry.fingerprint.length;
          const afterFingerprint = prose.substring(potentialOffset, potentialOffset + 50).trim();
          if (afterFingerprint.startsWith(anchor)) {
            currentEntry.offset = prose.indexOf(anchor, potentialOffset);
            currentEntry.status = 'active';
            found = true;
          }
        }

        // 3. Global search for ID tag
        if (!found) {
          const globalIndex = prose.indexOf(anchor);
          if (globalIndex !== -1) {
            currentEntry.offset = globalIndex;
            currentEntry.fingerprint = this.getFingerprint(prose, globalIndex);
            currentEntry.status = 'active';
            found = true;
          } else {
            currentEntry.status = 'awaiting-review';
          }
        }
      }

      // Check ranges if found
      if (found && currentEntry.ranges) {
        const blockStart = prose.lastIndexOf('\n\n', currentEntry.offset) + 2;
        for (const key in currentEntry.ranges) {
          const range = currentEntry.ranges[key];
          const currentText = prose.substring(blockStart + range.start, blockStart + range.end);
          if (currentText !== range.originalText) {
            currentEntry.ranges[key].status = 'awaiting-review';
            diffLog.push({
              id: currentEntry.id,
              timestamp: Date.now(),
              change: `Range ${key} text mismatch. Expected "${range.originalText}", found "${currentText}"`
            });
          }
        }
      }

      newManifest.push(currentEntry);
    }

    // Trim diff log to last 5
    const finalDiffLog = diffLog.slice(-5);

    const currentHash = await this.generateHash(prose);
    const finalMetadata: SemanticMetadata = {
      manifest: newManifest,
      diffLog: finalDiffLog,
      hash: currentHash
    };

    return prose + this.METADATA_DELIMITER + JSON.stringify(finalMetadata, null, 2);
  }

  /**
   * Generates a graph of connections
   */
  public static getGraph(text: string) {
    const prose = text.split(this.METADATA_DELIMITER)[0];
    
    const entities = Array.from(prose.matchAll(/\[\[(.*?)\]\]/g)).map(m => m[1]);
    const mentions = Array.from(prose.matchAll(/@([a-zA-Z0-9_-]+)/g)).map(m => m[1]);
    const tags = Array.from(prose.matchAll(/#([a-zA-Z0-9_-]+)/g)).map(m => m[1]);
    const anchors = Array.from(prose.matchAll(/\^([a-zA-Z0-9-]+)/g)).map(m => m[1]);

    return {
      entities: Array.from(new Set(entities)),
      mentions: Array.from(new Set(mentions)),
      tags: Array.from(new Set(tags)),
      anchors
    };
  }

  /**
   * Returns transcluded text for a specific ID or Range
   */
  public static transclude(fullText: string, targetId: string): string | null {
    const prose = fullText.split(this.METADATA_DELIMITER)[0];
    
    // Check for range syntax ^ID:Start-End
    const rangeMatch = targetId.match(/(.*?):(\d+)-(\d+)/);
    
    if (rangeMatch) {
      const id = rangeMatch[1];
      const start = parseInt(rangeMatch[2]);
      const end = parseInt(rangeMatch[3]);
      
      const anchor = `^${id}`;
      const anchorIndex = prose.indexOf(anchor);
      if (anchorIndex === -1) return null;

      // Find the block start. Usually the start of the paragraph.
      const blockStart = prose.lastIndexOf('\n\n', anchorIndex) + 2;
      const blockText = prose.substring(blockStart, anchorIndex);
      
      return blockText.substring(start, end);
    } else {
      const anchor = `^${targetId}`;
      const anchorIndex = prose.indexOf(anchor);
      if (anchorIndex === -1) return null;

      const blockStart = prose.lastIndexOf('\n\n', anchorIndex) + 2;
      return prose.substring(blockStart, anchorIndex);
    }
  }
}
